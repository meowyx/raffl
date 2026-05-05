// Full create → buy → request_draw → settle_raffle → claim_prize lifecycle.
// Switchboard randomness account is injected via the FakeRandomness helper
// since LiteSVM cannot run the actual Switchboard On-Demand program.

mod common;

use {
    anchor_lang::prelude::Pubkey,
    common::*,
    raffl::state::RaffleState,
    solana_account as solana_account_lib,
    solana_keypair::Keypair,
    solana_signer::Signer,
};

#[test]
fn full_lifecycle_pays_winner_creator_and_treasury() {
    let (mut svm, payer) = setup();

    let treasury = Keypair::new().pubkey();
    let fee_bps = 500u16; // 5%
    initialize_platform(&mut svm, &payer, fee_bps, treasury).expect("init platform");

    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let prize_amount = 5 * ONE_SOL;
    let ticket_price = ONE_SOL / 10; // 0.1 SOL
    let max_tickets: u32 = 4;
    let min_tickets: u32 = 2;
    let params = CreateParams {
        nonce: 1234,
        prize_type: raffl::state::PrizeType::Sol,
        prize_amount,
        prize_description: "lifecycle prize".to_string(),
        ticket_price,
        max_tickets,
        min_tickets,
        end_time: now + 7 * 24 * 60 * 60,
    };
    let create_ix = create_raffle_ix(&creator.pubkey(), &params);
    send(&mut svm, &[create_ix], &creator.pubkey(), &[&creator]).expect("create_raffle");

    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);
    let (vault_addr, _) = vault_pda(&raffle_addr);

    // Three buyers, four tickets (alice 0, bob 1, carol 2, alice 3).
    let alice = Keypair::new();
    let bob = Keypair::new();
    let carol = Keypair::new();
    fund(&mut svm, &alice.pubkey(), 5 * ONE_SOL);
    fund(&mut svm, &bob.pubkey(), 5 * ONE_SOL);
    fund(&mut svm, &carol.pubkey(), 5 * ONE_SOL);

    for (idx, buyer) in [(0u32, &alice), (1, &bob), (2, &carol), (3, &alice)] {
        let ix = buy_ticket_ix(&buyer.pubkey(), raffle_addr, idx);
        send(&mut svm, &[ix], &buyer.pubkey(), &[buyer])
            .unwrap_or_else(|e| panic!("buy ticket #{}: {:?}", idx, e));
    }

    let raffle = read_raffle(&svm, &raffle_addr);
    assert_eq!(raffle.tickets_sold, max_tickets, "raffle should be sold out");

    // Request draw — sold out condition satisfies readiness gate.
    let randomness_kp = Keypair::new();
    let randomness = randomness_kp.pubkey();
    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);

    let slot_at_commit = current_slot(&svm) + 1;
    warp_to_slot(&mut svm, slot_at_commit);
    let seed_slot = slot_at_commit - 1;
    inject_randomness_account(
        &mut svm,
        randomness,
        &FakeRandomness::unrevealed(seed_slot),
    );

    // request_draw is creator-only post-audit
    let req_ix = request_draw_ix(&creator.pubkey(), raffle_addr, randomness);
    send(&mut svm, &[req_ix], &creator.pubkey(), &[&creator]).expect("request_draw");

    let raffle = read_raffle(&svm, &raffle_addr);
    assert_eq!(raffle.state, RaffleState::Drawing);
    assert_eq!(raffle.vrf_account, randomness);
    assert_eq!(raffle.commit_slot, seed_slot);

    // Reveal: bump slot, swap injected account to revealed at the new slot.
    let reveal_slot = slot_at_commit + 1;
    warp_to_slot(&mut svm, reveal_slot);
    let mut value = [0u8; 32];
    // Bias the entropy so winning_ticket is deterministic and != 0/1/2/3 trivially.
    // entropy = u64::from_le_bytes([7,0,...,0]) = 7. 7 % 4 = 3 → ticket index 3 (alice's second ticket).
    value[0] = 7;
    inject_randomness_account(
        &mut svm,
        randomness,
        &FakeRandomness::revealed(seed_slot, reveal_slot, value),
    );

    let expected_idx = expected_winning_index(value, max_tickets);
    assert_eq!(expected_idx, 3, "test value chosen for ticket 3 = alice");
    let (winning_ticket_addr, _) = ticket_pda(&raffle_addr, expected_idx);

    let settle_ix =
        settle_raffle_ix(&initiator.pubkey(), raffle_addr, randomness, winning_ticket_addr);
    send(&mut svm, &[settle_ix], &initiator.pubkey(), &[&initiator]).expect("settle_raffle");

    let raffle = read_raffle(&svm, &raffle_addr);
    assert_eq!(raffle.state, RaffleState::Settled);
    assert_eq!(raffle.winning_ticket, Some(expected_idx));
    assert_eq!(raffle.winner, Some(alice.pubkey()));

    // Claim prize.
    let alice_before = svm.get_balance(&alice.pubkey()).unwrap_or(0);
    let creator_before = svm.get_balance(&creator.pubkey()).unwrap_or(0);
    // treasury may not exist as an on-chain account yet (no lamports sent) —
    // get_balance returns None in that case.
    let treasury_before = svm.get_balance(&treasury).unwrap_or(0);
    let vault_before = svm.get_balance(&vault_addr).unwrap_or(0);

    let claim_ix = claim_prize_ix(&alice.pubkey(), raffle_addr, creator.pubkey(), treasury);
    send(&mut svm, &[claim_ix], &alice.pubkey(), &[&alice]).expect("claim_prize");

    let raffle = read_raffle(&svm, &raffle_addr);
    assert_eq!(raffle.state, RaffleState::Claimed);

    let ticket_revenue = ticket_price as u128 * max_tickets as u128;
    let expected_fee = (ticket_revenue * fee_bps as u128 / 10_000) as u64;
    let expected_creator_share = ticket_revenue as u64 - expected_fee;

    let alice_after = svm.get_balance(&alice.pubkey()).unwrap_or(0);
    let creator_after = svm.get_balance(&creator.pubkey()).unwrap_or(0);
    let treasury_after = svm.get_balance(&treasury).unwrap_or(0);
    let vault_after = svm.get_balance(&vault_addr).unwrap_or(0);

    assert_eq!(
        treasury_after - treasury_before,
        expected_fee,
        "treasury receives exactly the fee"
    );
    assert_eq!(
        creator_after - creator_before,
        expected_creator_share,
        "creator receives ticket revenue minus fee"
    );
    // Alice paid the claim_prize tx fee (~5000 lamports), so net delta is
    // prize_amount minus tx fee. Assert at least prize - 1M lamports buffer.
    assert!(
        alice_after >= alice_before + prize_amount - 1_000_000,
        "winner receives ~prize_amount (minus tx fee)"
    );
    assert_eq!(
        vault_before - vault_after,
        prize_amount + ticket_revenue as u64,
        "vault drained of the entire pot"
    );

    // Re-claim must fail.
    let claim_again = claim_prize_ix(&alice.pubkey(), raffle_addr, creator.pubkey(), treasury);
    let res = send(&mut svm, &[claim_again], &alice.pubkey(), &[&alice]);
    assert!(res.is_err(), "second claim must fail (state != Settled)");
}

#[test]
fn request_draw_rejects_when_not_active() {
    let (mut svm, payer) = setup();
    let treasury = Keypair::new().pubkey();
    initialize_platform(&mut svm, &payer, 500, treasury).unwrap();

    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let params = CreateParams::good(now, 1);
    send(
        &mut svm,
        &[create_raffle_ix(&creator.pubkey(), &params)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);

    // Buy enough to satisfy min_tickets.
    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);
    for i in 0..2u32 {
        send(
            &mut svm,
            &[buy_ticket_ix(&buyer.pubkey(), raffle_addr, i)],
            &buyer.pubkey(),
            &[&buyer],
        )
        .unwrap();
    }

    // Sold out trigger: warp past end_time so request is "ready" to draw.
    warp_seconds(&mut svm, params.end_time - now + 60);

    let randomness = Keypair::new().pubkey();
    let slot = current_slot(&svm);
    inject_randomness_account(
        &mut svm,
        randomness,
        &FakeRandomness::unrevealed(slot.saturating_sub(1)),
    );

    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    send(
        &mut svm,
        &[request_draw_ix(&creator.pubkey(), raffle_addr, randomness)],
        &creator.pubkey(),
        &[&creator],
    )
    .expect("first request_draw");

    // Second request_draw must fail (state is now Drawing).
    let randomness2 = Keypair::new().pubkey();
    let slot2 = current_slot(&svm).saturating_sub(1);
    inject_randomness_account(&mut svm, randomness2, &FakeRandomness::unrevealed(slot2));
    let res = send(
        &mut svm,
        &[request_draw_ix(&creator.pubkey(), raffle_addr, randomness2)],
        &creator.pubkey(),
        &[&creator],
    );
    assert!(res.is_err(), "second request_draw must fail when state != Active");
}

#[test]
fn request_draw_rejects_below_min_tickets() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();

    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 11);
    params.min_tickets = 5;
    params.max_tickets = 10;
    send(
        &mut svm,
        &[create_raffle_ix(&creator.pubkey(), &params)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);

    // Buy only 2 tickets, well below min_tickets = 5.
    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);
    for i in 0..2u32 {
        send(
            &mut svm,
            &[buy_ticket_ix(&buyer.pubkey(), raffle_addr, i)],
            &buyer.pubkey(),
            &[&buyer],
        )
        .unwrap();
    }

    warp_seconds(&mut svm, params.end_time - now + 60);

    let randomness = Keypair::new().pubkey();
    let slot = current_slot(&svm);
    inject_randomness_account(
        &mut svm,
        randomness,
        &FakeRandomness::unrevealed(slot.saturating_sub(1)),
    );

    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    let res = send(
        &mut svm,
        &[request_draw_ix(&creator.pubkey(), raffle_addr, randomness)],
        &creator.pubkey(),
        &[&creator],
    );
    assert!(res.is_err(), "below min_tickets must reject");
}

#[test]
fn request_draw_rejects_when_not_ready() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();

    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let params = CreateParams::good(now, 21);
    send(
        &mut svm,
        &[create_raffle_ix(&creator.pubkey(), &params)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);

    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);
    for i in 0..2u32 {
        send(
            &mut svm,
            &[buy_ticket_ix(&buyer.pubkey(), raffle_addr, i)],
            &buyer.pubkey(),
            &[&buyer],
        )
        .unwrap();
    }
    // Do NOT warp past end_time and not sold out.

    let randomness = Keypair::new().pubkey();
    let slot = current_slot(&svm);
    inject_randomness_account(
        &mut svm,
        randomness,
        &FakeRandomness::unrevealed(slot.saturating_sub(1)),
    );

    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    let res = send(
        &mut svm,
        &[request_draw_ix(&creator.pubkey(), raffle_addr, randomness)],
        &creator.pubkey(),
        &[&creator],
    );
    assert!(res.is_err(), "neither sold-out nor expired must reject");
}

#[test]
fn request_draw_rejects_wrong_owner() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let params = CreateParams::good(now, 31);
    send(
        &mut svm,
        &[create_raffle_ix(&creator.pubkey(), &params)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);

    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);
    for i in 0..2u32 {
        send(
            &mut svm,
            &[buy_ticket_ix(&buyer.pubkey(), raffle_addr, i)],
            &buyer.pubkey(),
            &[&buyer],
        )
        .unwrap();
    }
    warp_seconds(&mut svm, params.end_time - now + 60);

    // Inject randomness account with the right layout but the WRONG owner.
    let randomness = Keypair::new().pubkey();
    let slot = current_slot(&svm);
    let mut data = vec![0u8; 408];
    data[0..8].copy_from_slice(&[10, 66, 229, 135, 220, 239, 217, 114]);
    data[104..112].copy_from_slice(&slot.saturating_sub(1).to_le_bytes());
    data[144..152].copy_from_slice(&u64::MAX.to_le_bytes());
    svm.set_account(
        randomness,
        solana_account_lib::Account {
            lamports: 5_000_000,
            data,
            owner: Pubkey::new_unique(), // NOT the Switchboard program
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();

    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    let res = send(
        &mut svm,
        &[request_draw_ix(&creator.pubkey(), raffle_addr, randomness)],
        &creator.pubkey(),
        &[&creator],
    );
    assert!(res.is_err(), "non-Switchboard owner must reject");
}

#[test]
fn settle_raffle_rejects_mismatched_randomness_account() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 41);
    params.max_tickets = 2;
    params.min_tickets = 2;
    send(
        &mut svm,
        &[create_raffle_ix(&creator.pubkey(), &params)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);

    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);
    for i in 0..2u32 {
        send(
            &mut svm,
            &[buy_ticket_ix(&buyer.pubkey(), raffle_addr, i)],
            &buyer.pubkey(),
            &[&buyer],
        )
        .unwrap();
    }

    let r1 = Keypair::new().pubkey();
    let slot = current_slot(&svm) + 1;
    warp_to_slot(&mut svm, slot);
    inject_randomness_account(&mut svm, r1, &FakeRandomness::unrevealed(slot - 1));

    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    send(
        &mut svm,
        &[request_draw_ix(&creator.pubkey(), raffle_addr, r1)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();

    // Try to settle using a DIFFERENT randomness account.
    let r2 = Keypair::new().pubkey();
    let reveal = current_slot(&svm) + 1;
    warp_to_slot(&mut svm, reveal);
    let value = [0u8; 32];
    inject_randomness_account(
        &mut svm,
        r2,
        &FakeRandomness::revealed(slot - 1, reveal, value),
    );

    let (winning, _) = ticket_pda(&raffle_addr, 0);
    let res = send(
        &mut svm,
        &[settle_raffle_ix(&initiator.pubkey(), raffle_addr, r2, winning)],
        &initiator.pubkey(),
        &[&initiator],
    );
    assert!(res.is_err(), "mismatched randomness account must reject");
}

#[test]
fn claim_prize_rejects_wrong_signer() {
    let (mut svm, payer) = setup();
    let treasury = Keypair::new().pubkey();
    initialize_platform(&mut svm, &payer, 500, treasury).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 51);
    params.max_tickets = 2;
    params.min_tickets = 2;
    send(
        &mut svm,
        &[create_raffle_ix(&creator.pubkey(), &params)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);

    let alice = Keypair::new();
    let bob = Keypair::new();
    fund(&mut svm, &alice.pubkey(), 5 * ONE_SOL);
    fund(&mut svm, &bob.pubkey(), 5 * ONE_SOL);
    send(
        &mut svm,
        &[buy_ticket_ix(&alice.pubkey(), raffle_addr, 0)],
        &alice.pubkey(),
        &[&alice],
    )
    .unwrap();
    send(
        &mut svm,
        &[buy_ticket_ix(&bob.pubkey(), raffle_addr, 1)],
        &bob.pubkey(),
        &[&bob],
    )
    .unwrap();

    let randomness = Keypair::new().pubkey();
    let slot = current_slot(&svm) + 1;
    warp_to_slot(&mut svm, slot);
    inject_randomness_account(&mut svm, randomness, &FakeRandomness::unrevealed(slot - 1));
    // request_draw is creator-only; signers are still permissionless on settle.
    send(
        &mut svm,
        &[request_draw_ix(&creator.pubkey(), raffle_addr, randomness)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();

    let reveal = slot + 1;
    warp_to_slot(&mut svm, reveal);
    // value bytes [0,0,...] → entropy 0 → winner index 0 → alice.
    let value = [0u8; 32];
    inject_randomness_account(
        &mut svm,
        randomness,
        &FakeRandomness::revealed(slot - 1, reveal, value),
    );
    let (winning, _) = ticket_pda(&raffle_addr, 0);
    send(
        &mut svm,
        &[settle_raffle_ix(&alice.pubkey(), raffle_addr, randomness, winning)],
        &alice.pubkey(),
        &[&alice],
    )
    .unwrap();

    // Bob (not the winner) attempts to claim.
    let res = send(
        &mut svm,
        &[claim_prize_ix(&bob.pubkey(), raffle_addr, creator.pubkey(), treasury)],
        &bob.pubkey(),
        &[&bob],
    );
    assert!(res.is_err(), "non-winner claim must reject");
}
