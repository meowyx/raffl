mod common;

use {
    common::*,
    raffl::state::{PrizeType, RaffleState},
    solana_keypair::Keypair,
    solana_signer::Signer,
};

const TREASURY_FEE_BPS: u16 = 500;

fn bootstrap() -> litesvm::LiteSVM {
    let (mut svm, payer) = setup();
    let treasury = Keypair::new().pubkey();
    initialize_platform(&mut svm, &payer, TREASURY_FEE_BPS, treasury)
        .expect("initialize_platform should succeed");
    svm
}

#[test]
fn happy_path_creates_raffle_and_escrows_prize() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let params = CreateParams::good(now, 42);
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let meta = send(&mut svm, &[ix], &creator.pubkey(), &[&creator])
        .expect("create_raffle should succeed");
    println!("create_raffle CUs: {}", meta.compute_units_consumed);

    let (raffle_addr, raffle_bump) = raffle_pda(&creator.pubkey(), params.nonce);
    let (vault_addr, vault_bump) = vault_pda(&raffle_addr);
    let raffle = read_raffle(&svm, &raffle_addr);

    assert_eq!(raffle.creator, creator.pubkey());
    assert_eq!(raffle.nonce, params.nonce);
    assert_eq!(raffle.prize_description, params.prize_description);
    assert_eq!(raffle.prize_type, PrizeType::Sol);
    assert_eq!(raffle.ticket_price, params.ticket_price);
    assert_eq!(raffle.max_tickets, params.max_tickets);
    assert_eq!(raffle.min_tickets, params.min_tickets);
    assert_eq!(raffle.tickets_sold, 0);
    assert_eq!(raffle.prize_amount, params.prize_amount);
    assert_eq!(raffle.end_time, params.end_time);
    assert_eq!(raffle.created_at, now);
    assert_eq!(raffle.state, RaffleState::Active);
    assert!(raffle.winning_ticket.is_none());
    assert!(raffle.winner.is_none());
    assert_eq!(raffle.bump, raffle_bump);
    assert_eq!(raffle.vault_bump, vault_bump);

    let vault_balance = svm.get_balance(&vault_addr).unwrap();
    assert_eq!(
        vault_balance, params.prize_amount,
        "vault must hold exactly prize_amount lamports"
    );

    let (platform_addr, _) = platform_pda();
    let platform = read_platform(&svm, &platform_addr);
    assert_eq!(platform.total_raffles, 1);
}

#[test]
fn rejects_non_sol_prize_type_for_v01() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 1);
    params.prize_type = PrizeType::Token;
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix], &creator.pubkey(), &[&creator]);
    assert!(res.is_err(), "non-Sol prize_type must be rejected in v0.1");
}

#[test]
fn rejects_prize_amount_below_floor() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 2);
    params.prize_amount = 1; // below MIN_PRIZE_AMOUNT_LAMPORTS
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix], &creator.pubkey(), &[&creator]);
    assert!(res.is_err(), "prize_amount below floor must be rejected");
}

#[test]
fn rejects_empty_prize_description() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 3);
    params.prize_description = "".to_string();
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix], &creator.pubkey(), &[&creator]);
    assert!(res.is_err(), "empty prize_description must be rejected");
}

#[test]
fn rejects_ticket_price_below_floor() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 4);
    params.ticket_price = 100; // below MIN_TICKET_PRICE_LAMPORTS = 1_000
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix], &creator.pubkey(), &[&creator]);
    assert!(res.is_err(), "ticket_price below floor must be rejected");
}

#[test]
fn rejects_max_tickets_below_min() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 5);
    params.max_tickets = 1; // below MIN_TICKETS_PER_RAFFLE
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix], &creator.pubkey(), &[&creator]);
    assert!(res.is_err(), "max_tickets below MIN must be rejected");
}

#[test]
fn rejects_min_tickets_above_max() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 6);
    params.max_tickets = 10;
    params.min_tickets = 11;
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix], &creator.pubkey(), &[&creator]);
    assert!(res.is_err(), "min_tickets > max_tickets must be rejected");
}

#[test]
fn rejects_duration_too_short() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 7);
    params.end_time = now + 60; // 1 minute - well under MIN_RAFFLE_DURATION_SECS
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix], &creator.pubkey(), &[&creator]);
    assert!(res.is_err(), "duration < MIN must be rejected");
}

#[test]
fn rejects_duration_too_long() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let mut params = CreateParams::good(now, 8);
    params.end_time = now + 365 * 24 * 60 * 60; // 1 year - over MAX
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix], &creator.pubkey(), &[&creator]);
    assert!(res.is_err(), "duration > MAX must be rejected");
}

#[test]
fn rejects_nonce_collision_for_same_creator() {
    let mut svm = bootstrap();
    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let params = CreateParams::good(now, 99);
    let ix1 = create_raffle_ix(&creator.pubkey(), &params);
    send(&mut svm, &[ix1], &creator.pubkey(), &[&creator]).expect("first create succeeds");

    let ix2 = create_raffle_ix(&creator.pubkey(), &params);
    let res = send(&mut svm, &[ix2], &creator.pubkey(), &[&creator]);
    assert!(
        res.is_err(),
        "reusing nonce for same creator must hit Anchor init guard"
    );
}

#[test]
fn allows_same_nonce_across_different_creators() {
    let mut svm = bootstrap();
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund(&mut svm, &alice.pubkey(), 50 * ONE_SOL);
    fund(&mut svm, &bob.pubkey(), 50 * ONE_SOL);

    let now = now_ts(&svm);
    let params = CreateParams::good(now, 7);

    let ix_a = create_raffle_ix(&alice.pubkey(), &params);
    send(&mut svm, &[ix_a], &alice.pubkey(), &[&alice]).expect("alice creates");

    let ix_b = create_raffle_ix(&bob.pubkey(), &params);
    send(&mut svm, &[ix_b], &bob.pubkey(), &[&bob])
        .expect("bob can reuse same nonce because PDA seed includes creator");
}
