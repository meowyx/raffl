mod common;

use {
    anchor_lang::{prelude::Pubkey, AccountDeserialize},
    common::*,
    raffl::state::Ticket,
    solana_keypair::Keypair,
    solana_signer::Signer,
};

fn bootstrap_with_raffle(
    nonce: u64,
) -> (litesvm::LiteSVM, Keypair, Pubkey, CreateParams) {
    let (mut svm, payer) = setup();
    let treasury = Keypair::new().pubkey();
    initialize_platform(&mut svm, &payer, 500, treasury)
        .expect("initialize_platform should succeed");

    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let params = CreateParams::good(now, nonce);

    let ix = create_raffle_ix(&creator.pubkey(), &params);
    send(&mut svm, &[ix], &creator.pubkey(), &[&creator]).expect("create_raffle");

    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);
    (svm, creator, raffle_addr, params)
}

#[test]
fn happy_path_buys_one_ticket() {
    let (mut svm, _creator, raffle_addr, params) = bootstrap_with_raffle(1);
    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);

    let buyer_balance_before = svm.get_balance(&buyer.pubkey()).unwrap();
    let (vault_addr, _) = vault_pda(&raffle_addr);
    let vault_before = svm.get_balance(&vault_addr).unwrap();

    let ix = buy_ticket_ix(&buyer.pubkey(), raffle_addr, 0);
    let meta = send(&mut svm, &[ix], &buyer.pubkey(), &[&buyer])
        .expect("buy_ticket should succeed");
    println!("buy_ticket CUs: {}", meta.compute_units_consumed);

    let raffle = read_raffle(&svm, &raffle_addr);
    assert_eq!(raffle.tickets_sold, 1);

    let (ticket_addr, ticket_bump) = ticket_pda(&raffle_addr, 0);
    let ticket_acc = svm.get_account(&ticket_addr).expect("ticket pda exists");
    let ticket = Ticket::try_deserialize(&mut ticket_acc.data.as_ref()).unwrap();
    assert_eq!(ticket.raffle, raffle_addr);
    assert_eq!(ticket.buyer, buyer.pubkey());
    assert_eq!(ticket.ticket_number, 0);
    assert_eq!(ticket.bump, ticket_bump);
    assert!(ticket.purchased_at > 0);

    let vault_after = svm.get_balance(&vault_addr).unwrap();
    assert_eq!(
        vault_after - vault_before,
        params.ticket_price,
        "vault gains exactly ticket_price"
    );
    let buyer_after = svm.get_balance(&buyer.pubkey()).unwrap();
    assert!(
        buyer_after < buyer_balance_before - params.ticket_price,
        "buyer pays ticket_price plus rent for ticket pda + tx fee"
    );
}

#[test]
fn happy_path_buys_multiple_tickets_sequentially() {
    let (mut svm, _creator, raffle_addr, _) = bootstrap_with_raffle(2);
    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 10 * ONE_SOL);

    for i in 0..3u32 {
        let ix = buy_ticket_ix(&buyer.pubkey(), raffle_addr, i);
        send(&mut svm, &[ix], &buyer.pubkey(), &[&buyer])
            .unwrap_or_else(|e| panic!("buy ticket #{}: {:?}", i, e));
    }

    let raffle = read_raffle(&svm, &raffle_addr);
    assert_eq!(raffle.tickets_sold, 3);
}

#[test]
fn rejects_buying_with_wrong_ticket_index() {
    // The ticket PDA seed embeds raffle.tickets_sold, so passing the
    // *wrong* index can't be done at the boundary - Anchor's seeds
    // constraint will fail before the handler runs.
    let (mut svm, _creator, raffle_addr, _) = bootstrap_with_raffle(3);
    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);

    // Skip index 0, try to mint index 1 first - tickets_sold is still 0,
    // so the seeds will derive a ticket PDA that doesn't match what the
    // handler expects.
    let ix = buy_ticket_ix(&buyer.pubkey(), raffle_addr, 1);
    let res = send(&mut svm, &[ix], &buyer.pubkey(), &[&buyer]);
    assert!(res.is_err(), "wrong ticket_number must be rejected by seed check");
}

#[test]
fn rejects_buy_after_end_time() {
    let (mut svm, _creator, raffle_addr, params) = bootstrap_with_raffle(4);
    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);

    // Warp past end_time. params.end_time is now + 7d, so warp 8 days.
    let advance = (params.end_time - now_ts(&svm)) + 60;
    warp_seconds(&mut svm, advance);

    let ix = buy_ticket_ix(&buyer.pubkey(), raffle_addr, 0);
    let res = send(&mut svm, &[ix], &buyer.pubkey(), &[&buyer]);
    assert!(res.is_err(), "buy after end_time must be rejected");
}

#[test]
fn rejects_buy_when_sold_out() {
    // Build a raffle with max_tickets = 2 so we can fill it cheaply.
    let (mut svm, payer) = setup();
    let treasury = Keypair::new().pubkey();
    initialize_platform(&mut svm, &payer, 500, treasury).unwrap();

    let creator = Keypair::new();
    fund(&mut svm, &creator.pubkey(), 50 * ONE_SOL);
    let now = now_ts(&svm);
    let params = CreateParams {
        nonce: 5,
        prize_type: raffl::state::PrizeType::Sol,
        prize_amount: 5 * ONE_SOL,
        prize_description: "small raffle".to_string(),
        ticket_price: ONE_SOL / 100,
        max_tickets: 2,
        min_tickets: 2,
        end_time: now + 7 * 24 * 60 * 60,
    };
    let ix = create_raffle_ix(&creator.pubkey(), &params);
    send(&mut svm, &[ix], &creator.pubkey(), &[&creator]).unwrap();
    let (raffle_addr, _) = raffle_pda(&creator.pubkey(), params.nonce);

    let buyer = Keypair::new();
    fund(&mut svm, &buyer.pubkey(), 5 * ONE_SOL);

    for i in 0..2u32 {
        let ix = buy_ticket_ix(&buyer.pubkey(), raffle_addr, i);
        send(&mut svm, &[ix], &buyer.pubkey(), &[&buyer]).unwrap();
    }

    // Third buy must fail: tickets_sold == max_tickets.
    let ix = buy_ticket_ix(&buyer.pubkey(), raffle_addr, 2);
    let res = send(&mut svm, &[ix], &buyer.pubkey(), &[&buyer]);
    assert!(res.is_err(), "buy when sold out must be rejected");
}

#[test]
fn rejects_double_buy_of_same_ticket_index() {
    let (mut svm, _creator, raffle_addr, _) = bootstrap_with_raffle(6);
    let alice = Keypair::new();
    let bob = Keypair::new();
    fund(&mut svm, &alice.pubkey(), 5 * ONE_SOL);
    fund(&mut svm, &bob.pubkey(), 5 * ONE_SOL);

    let ix1 = buy_ticket_ix(&alice.pubkey(), raffle_addr, 0);
    send(&mut svm, &[ix1], &alice.pubkey(), &[&alice]).expect("alice buys ticket 0");

    // Bob tries to also buy index 0. tickets_sold is now 1, so the seed-derived
    // ticket PDA for index 0 already exists; Anchor's `init` guard blocks it.
    // (The handler-supplied index from buyer is irrelevant; seeds use raffle.tickets_sold,
    // which is now 1, so bob would actually be deriving ticket 1 - this test mostly
    // proves the index advances and that index 0 can't be recreated.)
    let ix2 = buy_ticket_ix(&bob.pubkey(), raffle_addr, 0);
    let res = send(&mut svm, &[ix2], &bob.pubkey(), &[&bob]);
    assert!(res.is_err(), "passing stale ticket index must fail seed check");
}
