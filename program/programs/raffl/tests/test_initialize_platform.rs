use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::instruction::Instruction,
        system_program,
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::{types::TransactionResult, LiteSVM},
    raffl::{
        accounts as raffl_accounts,
        constants::PLATFORM_SEED,
        instruction as raffl_instruction,
        state::RafflePlatform,
    },
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const ONE_SOL: u64 = 1_000_000_000;

fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 50 * ONE_SOL).unwrap();
    let bytes = include_bytes!("../../../target/deploy/raffl.so");
    svm.add_program(raffl::id(), bytes).unwrap();
    (svm, payer)
}

fn platform_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[PLATFORM_SEED], &raffl::id())
}

fn send_initialize(
    svm: &mut LiteSVM,
    authority: &Keypair,
    fee_bps: u16,
    treasury: Pubkey,
) -> TransactionResult {
    let (platform, _) = platform_pda();
    let ix = Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::InitializePlatform {
            authority: authority.pubkey(),
            platform,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: raffl_instruction::InitializePlatform { fee_bps, treasury }.data(),
    };
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&authority.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[authority]).unwrap();
    let res = svm.send_transaction(tx);
    svm.expire_blockhash();
    res
}

#[test]
fn happy_path_initializes_platform() {
    let (mut svm, payer) = setup();
    let treasury = Keypair::new().pubkey();
    let fee_bps = 500u16;

    let meta = send_initialize(&mut svm, &payer, fee_bps, treasury)
        .expect("initialize_platform should succeed");
    println!("initialize_platform CUs: {}", meta.compute_units_consumed);

    let (platform_addr, expected_bump) = platform_pda();
    let acc = svm
        .get_account(&platform_addr)
        .expect("platform account exists after init");
    let state = RafflePlatform::try_deserialize(&mut acc.data.as_ref()).unwrap();

    assert_eq!(state.authority, payer.pubkey());
    assert_eq!(state.treasury, treasury);
    assert_eq!(state.fee_bps, fee_bps);
    assert_eq!(state.total_raffles, 0);
    assert_eq!(state.bump, expected_bump);
}

#[test]
fn rejects_fee_bps_above_cap() {
    let (mut svm, payer) = setup();
    let treasury = Keypair::new().pubkey();
    let res = send_initialize(&mut svm, &payer, 9_999, treasury);
    assert!(res.is_err(), "fee_bps over MAX_FEE_BPS must fail");
}

#[test]
fn rejects_default_treasury_pubkey() {
    let (mut svm, payer) = setup();
    let res = send_initialize(&mut svm, &payer, 500, Pubkey::default());
    assert!(res.is_err(), "default treasury pubkey must be rejected");
}

#[test]
fn rejects_reinitialization() {
    let (mut svm, payer) = setup();
    let treasury = Keypair::new().pubkey();
    send_initialize(&mut svm, &payer, 500, treasury).expect("first init succeeds");
    let res = send_initialize(&mut svm, &payer, 500, treasury);
    assert!(
        res.is_err(),
        "reinitialization must fail (Anchor `init` constraint)"
    );
}
