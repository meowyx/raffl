/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/raffl.json`.
 */
export type Raffl = {
  "address": "Finb5eCnqTNm33ssqS2ofEnuoHzCmXaWfuXEn4HcaGRA",
  "metadata": {
    "name": "raffl",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buyTicket",
      "discriminator": [
        11,
        24,
        17,
        193,
        168,
        116,
        164,
        169
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "raffle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  102,
                  102,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "raffle.creator",
                "account": "raffle"
              },
              {
                "kind": "account",
                "path": "raffle.nonce",
                "account": "raffle"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "shared-base §22 — bound to this exact raffle, no cross-raffle reuse."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "raffle"
              }
            ]
          }
        },
        {
          "name": "ticket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  99,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "raffle"
              },
              {
                "kind": "account",
                "path": "raffle.tickets_sold",
                "account": "raffle"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cancelRaffle",
      "discriminator": [
        135,
        191,
        223,
        141,
        192,
        186,
        234,
        254
      ],
      "accounts": [
        {
          "name": "initiator",
          "signer": true
        },
        {
          "name": "raffle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  102,
                  102,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "raffle.creator",
                "account": "raffle"
              },
              {
                "kind": "account",
                "path": "raffle.nonce",
                "account": "raffle"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "claimPrize",
      "discriminator": [
        157,
        233,
        139,
        121,
        246,
        62,
        234,
        235
      ],
      "accounts": [
        {
          "name": "winner",
          "writable": true,
          "signer": true
        },
        {
          "name": "platform",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "raffle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  102,
                  102,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "raffle.creator",
                "account": "raffle"
              },
              {
                "kind": "account",
                "path": "raffle.nonce",
                "account": "raffle"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "raffle"
              }
            ]
          }
        },
        {
          "name": "creator",
          "docs": [
            "Raffle creator — receives ticket revenue minus protocol fee.",
            "`mut` because lamports flow into this account."
          ],
          "writable": true
        },
        {
          "name": "treasury",
          "docs": [
            "Protocol treasury — receives the fee. Must match platform.treasury."
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createRaffle",
      "discriminator": [
        226,
        206,
        159,
        34,
        213,
        207,
        98,
        126
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "platform",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "raffle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  102,
                  102,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "are deposited via system_program::transfer below. Withdrawal paths",
            "(settle/claim/cancel) re-derive with `bump = raffle.vault_bump`."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "raffle"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "prizeType",
          "type": {
            "defined": {
              "name": "prizeType"
            }
          }
        },
        {
          "name": "prizeAmount",
          "type": "u64"
        },
        {
          "name": "prizeDescription",
          "type": "string"
        },
        {
          "name": "ticketPrice",
          "type": "u64"
        },
        {
          "name": "maxTickets",
          "type": "u32"
        },
        {
          "name": "minTickets",
          "type": "u32"
        },
        {
          "name": "endTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "initializePlatform",
      "discriminator": [
        119,
        201,
        101,
        45,
        75,
        122,
        89,
        3
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "platform",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "treasury",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "reclaimPrize",
      "discriminator": [
        74,
        240,
        215,
        247,
        126,
        227,
        246,
        135
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "raffle"
          ]
        },
        {
          "name": "raffle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  102,
                  102,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "raffle.creator",
                "account": "raffle"
              },
              {
                "kind": "account",
                "path": "raffle.nonce",
                "account": "raffle"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "raffle"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "refundTicket",
      "discriminator": [
        178,
        97,
        75,
        218,
        227,
        28,
        21,
        73
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "raffle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  102,
                  102,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "raffle.creator",
                "account": "raffle"
              },
              {
                "kind": "account",
                "path": "raffle.nonce",
                "account": "raffle"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "raffle"
              }
            ]
          }
        },
        {
          "name": "ticket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  99,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "raffle"
              },
              {
                "kind": "account",
                "path": "ticket.ticket_number",
                "account": "ticket"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "requestDraw",
      "discriminator": [
        22,
        180,
        8,
        81,
        47,
        21,
        86,
        159
      ],
      "accounts": [
        {
          "name": "initiator",
          "docs": [
            "Audit fix: must be the raffle creator. Permissionless `request_draw`",
            "let any actor pin a randomness account to the raffle and either",
            "(a) refuse to reveal — locking Drawing forever — or (b) bind the",
            "same SB account to multiple raffles in one tx, so only one of them",
            "could ever settle. Restricting to the creator removes both vectors:",
            "a malicious creator can already grief their own raffle (everyone",
            "loses), and the timeout-based `cancel_raffle` covers a creator who",
            "goes offline."
          ],
          "signer": true
        },
        {
          "name": "raffle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  102,
                  102,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "raffle.creator",
                "account": "raffle"
              },
              {
                "kind": "account",
                "path": "raffle.nonce",
                "account": "raffle"
              }
            ]
          }
        },
        {
          "name": "creator",
          "docs": [
            "on `raffle` above. Required because Anchor's `has_one` resolves field",
            "names against accounts in this struct."
          ],
          "relations": [
            "raffle"
          ]
        },
        {
          "name": "randomnessAccountData",
          "docs": [
            "verify the owner is the Switchboard program and that the data parses",
            "to the expected layout. No deserialize-by-anchor because we use the",
            "crate without the `anchor` feature (Anchor 1.0 trait conflict)."
          ]
        }
      ],
      "args": []
    },
    {
      "name": "settleRaffle",
      "discriminator": [
        136,
        98,
        44,
        133,
        40,
        36,
        190,
        185
      ],
      "accounts": [
        {
          "name": "initiator",
          "signer": true
        },
        {
          "name": "raffle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  102,
                  102,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "raffle.creator",
                "account": "raffle"
              },
              {
                "kind": "account",
                "path": "raffle.nonce",
                "account": "raffle"
              }
            ]
          }
        },
        {
          "name": "randomnessAccountData",
          "docs": [
            "the Switchboard program, key matches the one stored at request_draw,",
            "seed_slot matches commit_slot, and reveal_slot == current slot."
          ]
        },
        {
          "name": "ticket",
          "docs": [
            "The Ticket PDA at the derived winning index. Not initialized here —",
            "just read for ownership and `buyer` lookup. We re-derive seeds to",
            "confirm the caller can't substitute a different ticket."
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "raffle",
      "discriminator": [
        143,
        133,
        63,
        173,
        138,
        10,
        142,
        200
      ]
    },
    {
      "name": "rafflePlatform",
      "discriminator": [
        42,
        229,
        174,
        11,
        232,
        115,
        121,
        22
      ]
    },
    {
      "name": "ticket",
      "discriminator": [
        41,
        228,
        24,
        165,
        78,
        90,
        235,
        200
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "feeBpsTooHigh",
      "msg": "Fee exceeds the maximum allowed (MAX_FEE_BPS = 2000)"
    },
    {
      "code": 6001,
      "name": "invalidTreasury",
      "msg": "Treasury pubkey cannot be the default zero pubkey"
    },
    {
      "code": 6002,
      "name": "ticketPriceTooLow",
      "msg": "Ticket price is below MIN_TICKET_PRICE_LAMPORTS"
    },
    {
      "code": 6003,
      "name": "maxTicketsOutOfRange",
      "msg": "max_tickets must be within [MIN_TICKETS_PER_RAFFLE, MAX_TICKETS_PER_RAFFLE]"
    },
    {
      "code": 6004,
      "name": "minTicketsOutOfRange",
      "msg": "min_tickets must be within [MIN_TICKETS_PER_RAFFLE, max_tickets]"
    },
    {
      "code": 6005,
      "name": "durationOutOfRange",
      "msg": "Raffle duration is outside [MIN_RAFFLE_DURATION_SECS, MAX_RAFFLE_DURATION_SECS]"
    },
    {
      "code": 6006,
      "name": "prizeAmountTooLow",
      "msg": "Prize amount is below MIN_PRIZE_AMOUNT_LAMPORTS"
    },
    {
      "code": 6007,
      "name": "prizeDescriptionEmpty",
      "msg": "Prize description is empty"
    },
    {
      "code": 6008,
      "name": "prizeDescriptionTooLong",
      "msg": "Prize description exceeds MAX_PRIZE_DESCRIPTION_LEN bytes"
    },
    {
      "code": 6009,
      "name": "unsupportedPrizeType",
      "msg": "Only PrizeType::Sol is supported in v0.1"
    },
    {
      "code": 6010,
      "name": "raffleNotActive",
      "msg": "Raffle is not in Active state"
    },
    {
      "code": 6011,
      "name": "raffleNotDrawing",
      "msg": "Raffle is not in Drawing state"
    },
    {
      "code": 6012,
      "name": "raffleNotSettled",
      "msg": "Raffle is not in Settled state"
    },
    {
      "code": 6013,
      "name": "raffleExpired",
      "msg": "Raffle has reached its end_time"
    },
    {
      "code": 6014,
      "name": "raffleSoldOut",
      "msg": "Raffle has sold out its max_tickets"
    },
    {
      "code": 6015,
      "name": "raffleNotReadyToDraw",
      "msg": "Raffle is not yet ready to draw (end_time not reached and not sold out)"
    },
    {
      "code": 6016,
      "name": "notEnoughTicketsSold",
      "msg": "Not enough tickets sold to draw this raffle (tickets_sold < min_tickets)"
    },
    {
      "code": 6017,
      "name": "invalidRandomnessAccountOwner",
      "msg": "Switchboard randomness account owner mismatch"
    },
    {
      "code": 6018,
      "name": "invalidRandomnessAccountData",
      "msg": "Switchboard randomness account discriminator/data parse failed"
    },
    {
      "code": 6019,
      "name": "randomnessNotFresh",
      "msg": "Switchboard randomness was not committed in the previous slot (freshness check failed)"
    },
    {
      "code": 6020,
      "name": "randomnessAlreadyRevealed",
      "msg": "Switchboard randomness has already been revealed before commit"
    },
    {
      "code": 6021,
      "name": "randomnessNotResolved",
      "msg": "Switchboard randomness has not yet been resolved at the current slot"
    },
    {
      "code": 6022,
      "name": "randomnessAccountMismatch",
      "msg": "Provided randomness account does not match the one stored on the raffle"
    },
    {
      "code": 6023,
      "name": "commitSlotMismatch",
      "msg": "Switchboard seed_slot does not match the committed slot stored on the raffle"
    },
    {
      "code": 6024,
      "name": "winningTicketMismatch",
      "msg": "Provided winning ticket PDA does not match the derived winner index"
    },
    {
      "code": 6025,
      "name": "notTheWinner",
      "msg": "Signer is not the recorded winner of this raffle"
    },
    {
      "code": 6026,
      "name": "invalidCreatorAccount",
      "msg": "Provided creator account does not match the raffle creator"
    },
    {
      "code": 6027,
      "name": "invalidTreasuryAccount",
      "msg": "Provided treasury account does not match the platform treasury"
    },
    {
      "code": 6028,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6029,
      "name": "notRaffleCreator",
      "msg": "Only the raffle creator can initiate the draw"
    },
    {
      "code": 6030,
      "name": "raffleNotCancelled",
      "msg": "Raffle is not in Cancelled state"
    },
    {
      "code": 6031,
      "name": "raffleNotCancellable",
      "msg": "Raffle does not meet the conditions to be cancelled"
    },
    {
      "code": 6032,
      "name": "invalidBuyerAccount",
      "msg": "Provided buyer account does not match the ticket buyer"
    }
  ],
  "types": [
    {
      "name": "prizeType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "sol"
          },
          {
            "name": "token"
          },
          {
            "name": "nft"
          },
          {
            "name": "physical"
          }
        ]
      }
    },
    {
      "name": "raffle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "prizeDescription",
            "type": "string"
          },
          {
            "name": "prizeType",
            "type": {
              "defined": {
                "name": "prizeType"
              }
            }
          },
          {
            "name": "ticketPrice",
            "type": "u64"
          },
          {
            "name": "maxTickets",
            "type": "u32"
          },
          {
            "name": "minTickets",
            "type": "u32"
          },
          {
            "name": "ticketsSold",
            "type": "u32"
          },
          {
            "name": "prizeAmount",
            "type": "u64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "raffleState"
              }
            }
          },
          {
            "name": "winningTicket",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "winner",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "vrfAccount",
            "type": "pubkey"
          },
          {
            "name": "commitSlot",
            "type": "u64"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "rafflePlatform",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "totalRaffles",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "raffleState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "drawing"
          },
          {
            "name": "settled"
          },
          {
            "name": "claimed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "ticket",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "raffle",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "ticketNumber",
            "type": "u32"
          },
          {
            "name": "purchasedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "platformSeed",
      "type": "bytes",
      "value": "[112, 108, 97, 116, 102, 111, 114, 109]"
    },
    {
      "name": "raffleSeed",
      "type": "bytes",
      "value": "[114, 97, 102, 102, 108, 101]"
    },
    {
      "name": "ticketSeed",
      "type": "bytes",
      "value": "[116, 105, 99, 107, 101, 116]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};
