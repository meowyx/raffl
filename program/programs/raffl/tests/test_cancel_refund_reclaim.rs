// Audit-fix coverage: cancel_raffle + refund_ticket + reclaim_prize.

mod common;

use {
    common::*,
    raffl::state::RaffleState,
    solana_keypair::Keypair,
    solana_signer::Signer,
};

const STALE_DRAW_TIMEOUT_SECS: i64 = 3_600;

#[test]
fn cancel_then_refund_then_reclaim_drains_vault() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();

    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 1);
    params.min_tickets = 5;
    params.max_tickets = 10;
    let prize_amount = params.prize_amount;
    let ticket_price = params.ticket_price;
    send(
        &mut svm,
        &[create_raffle_ix(&creator.pubkey(), &params)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);
    let (vault_addr, _) = vault_pda(&raffle_addr);

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

    let vault_after_buys = svm.get_balance(&vault_addr).unwrap();
    assert_eq!(vault_after_buys, prize_amount + 2 * ticket_price);

    // Warp past end_time and cancel.
    warp_seconds(&mut svm, params.end_time - now + 60);
    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    send(
        &mut svm,
        &[cancel_raffle_ix(&initiator.pubkey(), raffle_addr)],
        &initiator.pubkey(),
        &[&initiator],
    )
    .expect("cancel_raffle (under-subscribed)");

    let raffle = read_raffle(&svm, &raffle_addr);
    assert_eq!(raffle.state, RaffleState::Cancelled);

    // Buyer refunds both tickets.
    let buyer_before_refund = svm.get_balance(&buyer.pubkey()).unwrap();
    for i in 0..2u32 {
        send(
            &mut svm,
            &[refund_ticket_ix(&buyer.pubkey(), raffle_addr, i)],
            &buyer.pubkey(),
            &[&buyer],
        )
        .unwrap_or_else(|e| panic!("refund_ticket #{}: {:?}", i, e));
    }
    let buyer_after_refund = svm.get_balance(&buyer.pubkey()).unwrap();
    assert!(
        buyer_after_refund > buyer_before_refund + 2 * ticket_price,
        "buyer gets ticket_price × 2 + ticket-rent on close"
    );

    // Creator reclaims prize.
    let creator_before = svm.get_balance(&creator.pubkey()).unwrap();
    send(
        &mut svm,
        &[reclaim_prize_ix(&creator.pubkey(), raffle_addr)],
        &creator.pubkey(),
        &[&creator],
    )
    .expect("reclaim_prize");
    let creator_after = svm.get_balance(&creator.pubkey()).unwrap();
    assert!(
        creator_after >= creator_before + prize_amount - 100_000,
        "creator gets prize_amount back (minus tx fee)"
    );

    let vault_after = svm.get_balance(&vault_addr).unwrap_or(0);
    assert!(
        vault_after < 100_000,
        "vault drained (any remainder must be < tx-fee dust)"
    );

    // Re-reclaim must fail.
    let res = send(
        &mut svm,
        &[reclaim_prize_ix(&creator.pubkey(), raffle_addr)],
        &creator.pubkey(),
        &[&creator],
    );
    assert!(res.is_err(), "second reclaim must fail (prize_amount zeroed)");
}

#[test]
fn cancel_raffle_rejects_when_active_and_min_tickets_met() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 2);
    params.min_tickets = 2;
    params.max_tickets = 10;
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
    for i in 0..3u32 {
        send(
            &mut svm,
            &[buy_ticket_ix(&buyer.pubkey(), raffle_addr, i)],
            &buyer.pubkey(),
            &[&buyer],
        )
        .unwrap();
    }
    warp_seconds(&mut svm, params.end_time - now + 60);

    // tickets_sold (3) >= min_tickets (2) → not eligible for cancel-because-undersold.
    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    let res = send(
        &mut svm,
        &[cancel_raffle_ix(&initiator.pubkey(), raffle_addr)],
        &initiator.pubkey(),
        &[&initiator],
    );
    assert!(res.is_err(), "Active + sufficient tickets must reject cancel");
}

#[test]
fn cancel_raffle_rejects_active_before_end_time() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 3);
    params.min_tickets = 5;
    send(
        &mut svm,
        &[create_raffle_ix(&creator.pubkey(), &params)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);

    // No buyers, but end_time hasn't passed yet.
    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    let res = send(
        &mut svm,
        &[cancel_raffle_ix(&initiator.pubkey(), raffle_addr)],
        &initiator.pubkey(),
        &[&initiator],
    );
    assert!(res.is_err(), "before end_time must reject cancel");
}

#[test]
fn cancel_drawing_after_stale_timeout_succeeds() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 4);
    params.min_tickets = 2;
    params.max_tickets = 2;
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

    let randomness = Keypair::new().pubkey();
    let slot = current_slot(&svm) + 1;
    warp_to_slot(&mut svm, slot);
    inject_randomness_account(&mut svm, randomness, &FakeRandomness::unrevealed(slot - 1));
    send(
        &mut svm,
        &[request_draw_ix(&creator.pubkey(), raffle_addr, randomness)],
        &creator.pubkey(),
        &[&creator],
    )
    .unwrap();

    // Try to cancel BEFORE end_time + STALE_DRAW_TIMEOUT — must reject.
    let initiator = Keypair::new();
    fund(&mut svm, &initiator.pubkey(), ONE_SOL);
    let res = send(
        &mut svm,
        &[cancel_raffle_ix(&initiator.pubkey(), raffle_addr)],
        &initiator.pubkey(),
        &[&initiator],
    );
    assert!(res.is_err(), "Drawing pre-timeout must reject cancel");

    // Now warp past end_time + STALE_DRAW_TIMEOUT — must succeed.
    let to_warp = (params.end_time - now_ts(&svm)) + STALE_DRAW_TIMEOUT_SECS + 60;
    warp_seconds(&mut svm, to_warp);
    send(
        &mut svm,
        &[cancel_raffle_ix(&initiator.pubkey(), raffle_addr)],
        &initiator.pubkey(),
        &[&initiator],
    )
    .expect("Drawing past stale timeout must allow cancel");
    let raffle = read_raffle(&svm, &raffle_addr);
    assert_eq!(raffle.state, RaffleState::Cancelled);
}

#[test]
fn refund_ticket_rejects_when_not_cancelled() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let params = CreateParams::good(now, 5);
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
    send(
        &mut svm,
        &[buy_ticket_ix(&buyer.pubkey(), raffle_addr, 0)],
        &buyer.pubkey(),
        &[&buyer],
    )
    .unwrap();

    let res = send(
        &mut svm,
        &[refund_ticket_ix(&buyer.pubkey(), raffle_addr, 0)],
        &buyer.pubkey(),
        &[&buyer],
    );
    assert!(res.is_err(), "refund_ticket while still Active must reject");
}

#[test]
fn refund_ticket_rejects_wrong_buyer() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 6);
    params.min_tickets = 5;
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
    warp_seconds(&mut svm, params.end_time - now + 60);
    send(
        &mut svm,
        &[cancel_raffle_ix(&alice.pubkey(), raffle_addr)],
        &alice.pubkey(),
        &[&alice],
    )
    .unwrap();

    // Bob tries to refund Alice's ticket.
    let res = send(
        &mut svm,
        &[refund_ticket_ix(&bob.pubkey(), raffle_addr, 0)],
        &bob.pubkey(),
        &[&bob],
    );
    assert!(res.is_err(), "non-buyer refund must reject");
}

#[test]
fn request_draw_rejects_non_creator() {
    let (mut svm, payer) = setup();
    initialize_platform(&mut svm, &payer, 500, Keypair::new().pubkey()).unwrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 7);
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

    let randomness = Keypair::new().pubkey();
    let slot = current_slot(&svm);
    inject_randomness_account(
        &mut svm,
        randomness,
        &FakeRandomness::unrevealed(slot.saturating_sub(1)),
    );

    // Random non-creator tries to call request_draw — must reject.
    let attacker = Keypair::new();
    fund(&mut svm, &attacker.pubkey(), ONE_SOL);
    let res = send(
        &mut svm,
        &[request_draw_ix(&attacker.pubkey(), raffle_addr, randomness)],
        &attacker.pubkey(),
        &[&attacker],
    );
    assert!(res.is_err(), "non-creator request_draw must reject (audit fix #2/#3)");
}
