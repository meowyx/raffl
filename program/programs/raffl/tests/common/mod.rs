// Shared test helpers for raffl's LiteSVM suite.
// Per litesvm.md §8a: extract setup; never share mutable state via statics.

#![allow(dead_code)]

use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::instruction::Instruction,
        system_program, AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::{types::TransactionResult, LiteSVM},
    raffl::{
        accounts as raffl_accounts,
        constants::{PLATFORM_SEED, RAFFLE_SEED, SB_ON_DEMAND_DEVNET_PID, TICKET_SEED, VAULT_SEED},
        instruction as raffl_instruction,
        state::{PrizeType, Raffle, RafflePlatform},
    },
    solana_account::Account,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

pub const ONE_SOL: u64 = 1_000_000_000;

pub fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();

    // LiteSVM defaults unix_timestamp to 0; force a realistic epoch so
    // duration validation and purchased_at fields behave like mainnet.
    let mut clock: anchor_lang::prelude::Clock = svm.get_sysvar();
    clock.unix_timestamp = 1_700_000_000; // 2023-11-14
    svm.set_sysvar(&clock);

    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 200 * ONE_SOL).unwrap();
    let bytes = include_bytes!("../../../../target/deploy/raffl.so");
    svm.add_program(raffl::id(), bytes).unwrap();
    (svm, payer)
}

pub fn fund(svm: &mut LiteSVM, pubkey: &Pubkey, lamports: u64) {
    svm.airdrop(pubkey, lamports).unwrap();
}

pub fn platform_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[PLATFORM_SEED], &raffl::id())
}

pub fn raffle_pda(creator: &Pubkey, nonce: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[RAFFLE_SEED, creator.as_ref(), &nonce.to_le_bytes()],
        &raffl::id(),
    )
}

pub fn vault_pda(raffle: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[VAULT_SEED, raffle.as_ref()], &raffl::id())
}

pub fn ticket_pda(raffle: &Pubkey, ticket_number: u32) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[TICKET_SEED, raffle.as_ref(), &ticket_number.to_le_bytes()],
        &raffl::id(),
    )
}

pub fn send(
    svm: &mut LiteSVM,
    ixs: &[Instruction],
    payer: &Pubkey,
    signers: &[&Keypair],
) -> TransactionResult {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(ixs, Some(payer), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers).unwrap();
    let res = svm.send_transaction(tx);
    svm.expire_blockhash();
    res
}

pub fn initialize_platform(
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
    send(svm, &[ix], &authority.pubkey(), &[authority])
}

pub struct CreateParams {
    pub nonce: u64,
    pub prize_type: PrizeType,
    pub prize_amount: u64,
    pub prize_description: String,
    pub ticket_price: u64,
    pub max_tickets: u32,
    pub min_tickets: u32,
    pub end_time: i64,
}

impl CreateParams {
    pub fn good(now: i64, nonce: u64) -> Self {
        Self {
            nonce,
            prize_type: PrizeType::Sol,
            prize_amount: 5 * ONE_SOL,
            prize_description: "test sol prize".to_string(),
            ticket_price: ONE_SOL / 100, // 0.01 SOL
            max_tickets: 100,
            min_tickets: 2,
            end_time: now + 7 * 24 * 60 * 60, // 7 days out
        }
    }
}

pub fn create_raffle_ix(creator: &Pubkey, params: &CreateParams) -> Instruction {
    let (platform, _) = platform_pda();
    let (raffle, _) = raffle_pda(creator, params.nonce);
    let (vault, _) = vault_pda(&raffle);

    Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::CreateRaffle {
            creator: *creator,
            platform,
            raffle,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: raffl_instruction::CreateRaffle {
            nonce: params.nonce,
            prize_type: params.prize_type,
            prize_amount: params.prize_amount,
            prize_description: params.prize_description.clone(),
            ticket_price: params.ticket_price,
            max_tickets: params.max_tickets,
            min_tickets: params.min_tickets,
            end_time: params.end_time,
        }
        .data(),
    }
}

pub fn buy_ticket_ix(buyer: &Pubkey, raffle: Pubkey, ticket_number: u32) -> Instruction {
    let (vault, _) = vault_pda(&raffle);
    let (ticket, _) = ticket_pda(&raffle, ticket_number);

    Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::BuyTicket {
            buyer: *buyer,
            raffle,
            vault,
            ticket,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: raffl_instruction::BuyTicket {}.data(),
    }
}

pub fn read_raffle(svm: &LiteSVM, raffle: &Pubkey) -> Raffle {
    let acc = svm.get_account(raffle).expect("raffle account exists");
    Raffle::try_deserialize(&mut acc.data.as_ref()).unwrap()
}

pub fn read_platform(svm: &LiteSVM, platform: &Pubkey) -> RafflePlatform {
    let acc = svm.get_account(platform).expect("platform account exists");
    RafflePlatform::try_deserialize(&mut acc.data.as_ref()).unwrap()
}

pub fn now_ts(svm: &LiteSVM) -> i64 {
    let clock: anchor_lang::prelude::Clock = svm.get_sysvar();
    clock.unix_timestamp
}

pub fn warp_seconds(svm: &mut LiteSVM, secs: i64) {
    let mut clock: anchor_lang::prelude::Clock = svm.get_sysvar();
    clock.unix_timestamp += secs;
    svm.set_sysvar(&clock);
    svm.expire_blockhash();
}

pub fn current_slot(svm: &LiteSVM) -> u64 {
    let clock: anchor_lang::prelude::Clock = svm.get_sysvar();
    clock.slot
}

pub fn warp_to_slot(svm: &mut LiteSVM, slot: u64) {
    let mut clock: anchor_lang::prelude::Clock = svm.get_sysvar();
    clock.slot = slot;
    svm.set_sysvar(&clock);
    svm.expire_blockhash();
}

// Switchboard On-Demand RandomnessAccountData byte layout (verbatim from
// switchboard_on_demand::accounts::randomness):
//   [0..8]    discriminator [10, 66, 229, 135, 220, 239, 217, 114]
//   [8..40]   authority (Pubkey, 32)
//   [40..72]  queue (Pubkey, 32)
//   [72..104] seed_slothash ([u8; 32])
//   [104..112] seed_slot (u64 LE)
//   [112..144] oracle (Pubkey, 32)
//   [144..152] reveal_slot (u64 LE)
//   [152..184] value ([u8; 32])
//   [184..280] _ebuf2 ([u8; 96])
//   [280..408] _ebuf1 ([u8; 128])
const SB_DISCRIMINATOR: [u8; 8] = [10, 66, 229, 135, 220, 239, 217, 114];
const SB_ACCOUNT_LEN: usize = 408;

pub struct FakeRandomness {
    pub seed_slot: u64,
    pub reveal_slot: u64,
    pub value: [u8; 32],
}

impl FakeRandomness {
    pub fn unrevealed(seed_slot: u64) -> Self {
        Self {
            seed_slot,
            // reveal_slot != current slot ensures `get_value` returns Err.
            reveal_slot: u64::MAX,
            value: [0u8; 32],
        }
    }

    pub fn revealed(seed_slot: u64, reveal_slot: u64, value: [u8; 32]) -> Self {
        Self {
            seed_slot,
            reveal_slot,
            value,
        }
    }
}

pub fn inject_randomness_account(svm: &mut LiteSVM, address: Pubkey, r: &FakeRandomness) {
    let mut data = vec![0u8; SB_ACCOUNT_LEN];
    data[0..8].copy_from_slice(&SB_DISCRIMINATOR);
    // authority [8..40], queue [40..72], seed_slothash [72..104] left as zeros.
    data[104..112].copy_from_slice(&r.seed_slot.to_le_bytes());
    // oracle [112..144] zero.
    data[144..152].copy_from_slice(&r.reveal_slot.to_le_bytes());
    data[152..184].copy_from_slice(&r.value);
    // _ebuf2 [184..280] and _ebuf1 [280..408] zero.

    svm.set_account(
        address,
        Account {
            lamports: 5_000_000,
            data,
            owner: SB_ON_DEMAND_DEVNET_PID,
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();
}

pub fn request_draw_ix(creator: &Pubkey, raffle: Pubkey, randomness: Pubkey) -> Instruction {
    // Audit fix: initiator must be the raffle creator.
    Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::RequestDraw {
            initiator: *creator,
            raffle,
            creator: *creator,
            randomness_account_data: randomness,
        }
        .to_account_metas(None),
        data: raffl_instruction::RequestDraw {}.data(),
    }
}

pub fn cancel_raffle_ix(initiator: &Pubkey, raffle: Pubkey) -> Instruction {
    Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::CancelRaffle {
            initiator: *initiator,
            raffle,
        }
        .to_account_metas(None),
        data: raffl_instruction::CancelRaffle {}.data(),
    }
}

pub fn refund_ticket_ix(buyer: &Pubkey, raffle: Pubkey, ticket_number: u32) -> Instruction {
    let (vault, _) = vault_pda(&raffle);
    let (ticket, _) = ticket_pda(&raffle, ticket_number);
    Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::RefundTicket {
            buyer: *buyer,
            raffle,
            vault,
            ticket,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: raffl_instruction::RefundTicket {}.data(),
    }
}

pub fn reclaim_prize_ix(creator: &Pubkey, raffle: Pubkey) -> Instruction {
    let (vault, _) = vault_pda(&raffle);
    Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::ReclaimPrize {
            creator: *creator,
            raffle,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: raffl_instruction::ReclaimPrize {}.data(),
    }
}

pub fn settle_raffle_ix(
    initiator: &Pubkey,
    raffle: Pubkey,
    randomness: Pubkey,
    winning_ticket: Pubkey,
) -> Instruction {
    Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::SettleRaffle {
            initiator: *initiator,
            raffle,
            randomness_account_data: randomness,
            ticket: winning_ticket,
        }
        .to_account_metas(None),
        data: raffl_instruction::SettleRaffle {}.data(),
    }
}

pub fn claim_prize_ix(
    winner: &Pubkey,
    raffle: Pubkey,
    creator: Pubkey,
    treasury: Pubkey,
) -> Instruction {
    let (platform, _) = platform_pda();
    let (vault, _) = vault_pda(&raffle);
    Instruction {
        program_id: raffl::id(),
        accounts: raffl_accounts::ClaimPrize {
            winner: *winner,
            platform,
            raffle,
            vault,
            creator,
            treasury,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
        data: raffl_instruction::ClaimPrize {}.data(),
    }
}

/// Compute the expected winning ticket index for an injected randomness value.
/// Mirrors the on-chain logic in settle_raffle.
pub fn expected_winning_index(value: [u8; 32], tickets_sold: u32) -> u32 {
    let entropy = u64::from_le_bytes(value[0..8].try_into().unwrap());
    (entropy % tickets_sold as u64) as u32
}
