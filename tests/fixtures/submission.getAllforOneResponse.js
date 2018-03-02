exports.getAllForOnedbResponse = {
  records: [
    {
      'keys': [
        'submissions',
        'collect(answers)'
      ],
      'length': 2,
      '_fields': [
        {
          'start': {
            'identity': {
              'low': 1263,
              'high': 0
            },
            'labels': [
              'Contract'
            ],
            'properties': {
              'ct': 'CT-05781',
              'dts': 'abc,as,bcm,dp,pci,sla,tdd',
              'caName': 'CA-07597',
              'drId': 'aB5L00000004I35KAE',
              'caId': 'aB3L0000000CbvGKAS',
              'name': 'IT Equipment',
              'drName': 'DR-15388',
              'id': 'aB4L00000008TYSKA2'
            }
          },
          'end': {
            'identity': {
              'low': 1265,
              'high': 0
            },
            'labels': [
              'Submission'
            ],
            'properties': {
              'surveyId': 'as',
              'supplierId': '',
              'contractId': 'aB4L00000008TYSKA2',
              'id': 'asaB4L00000008TYSKA2',
              'submittedDate': {
                'low': -427291443,
                'high': 353
              },
              'type': '',
              'status': 'submitted'
            }
          },
          'segments': [
            {
              'start': {
                'identity': {
                  'low': 1263,
                  'high': 0
                },
                'labels': [
                  'Contract'
                ],
                'properties': {
                  'ct': 'CT-05781',
                  'dts': 'abc,as,bcm,dp,pci,sla,tdd',
                  'caName': 'CA-07597',
                  'drId': 'aB5L00000004I35KAE',
                  'caId': 'aB3L0000000CbvGKAS',
                  'name': 'IT Equipment',
                  'drName': 'DR-15388',
                  'id': 'aB4L00000008TYSKA2'
                }
              },
              'relationship': {
                'identity': {
                  'low': 1304,
                  'high': 0
                },
                'start': {
                  'low': 1263,
                  'high': 0
                },
                'end': {
                  'low': 1265,
                  'high': 0
                },
                'type': 'SUBMITS',
                'properties': {}
              },
              'end': {
                'identity': {
                  'low': 1265,
                  'high': 0
                },
                'labels': [
                  'Submission'
                ],
                'properties': {
                  'surveyId': 'as',
                  'supplierId': '',
                  'contractId': 'aB4L00000008TYSKA2',
                  'id': 'asaB4L00000008TYSKA2',
                  'submittedDate': {
                    'low': -427291443,
                    'high': 353
                  },
                  'type': '',
                  'status': 'submitted'
                }
              }
            }
          ],
          'length': 1
        },
        [
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1009,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'fieldType': 'binary',
                'id': 'as_01',
                'text': 'Does your company have a policy on Anti-Slavery?'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1559,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1641,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1641,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_01',
                    'id': 'as_01asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'Yes'
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1641,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_01',
                    'id': 'as_01asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'Yes'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1560,
                    'high': 0
                  },
                  'start': {
                    'low': 1641,
                    'high': 0
                  },
                  'end': {
                    'low': 1009,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1009,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'fieldType': 'binary',
                    'id': 'as_01',
                    'text': 'Does your company have a policy on Anti-Slavery?'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1013,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'fieldType': 'long-text',
                'id': 'as_03',
                'text': 'Please summarise the steps your company has taken to ensure that slavery and human trafficking is not taking place in its business or supply chains'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1563,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1643,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1643,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_03',
                    'id': 'as_03asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'steps'
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1643,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_03',
                    'id': 'as_03asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'steps'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1564,
                    'high': 0
                  },
                  'start': {
                    'low': 1643,
                    'high': 0
                  },
                  'end': {
                    'low': 1013,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1013,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'fieldType': 'long-text',
                    'id': 'as_03',
                    'text': 'Please summarise the steps your company has taken to ensure that slavery and human trafficking is not taking place in its business or supply chains'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1010,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'id': 'as_02',
                'text': 'Please explain the stance your organisation takes on Anti-Slavery',
                'fieldType': 'long-text',
                'prompt': 'If you are a UK Entity and have published a statement in line with the Modern Slavery Act, please include a link to your online statement'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1561,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1642,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1642,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_02',
                    'id': 'as_02asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': ''
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1642,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_02',
                    'id': 'as_02asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': ''
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1562,
                    'high': 0
                  },
                  'start': {
                    'low': 1642,
                    'high': 0
                  },
                  'end': {
                    'low': 1010,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1010,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'id': 'as_02',
                    'text': 'Please explain the stance your organisation takes on Anti-Slavery',
                    'fieldType': 'long-text',
                    'prompt': 'If you are a UK Entity and have published a statement in line with the Modern Slavery Act, please include a link to your online statement'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1015,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'fieldType': 'long-text',
                'id': 'as_05',
                'text': 'Please describe your Anti-Slavery training'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1567,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1645,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1645,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_05',
                    'id': 'as_05asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': ''
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1645,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_05',
                    'id': 'as_05asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': ''
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1568,
                    'high': 0
                  },
                  'start': {
                    'low': 1645,
                    'high': 0
                  },
                  'end': {
                    'low': 1015,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1015,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'fieldType': 'long-text',
                    'id': 'as_05',
                    'text': 'Please describe your Anti-Slavery training'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1014,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'fieldType': 'binary',
                'id': 'as_04',
                'text': 'Do you provide training to key staff on your Anti-Slavery Policy?'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1565,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1644,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1644,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_04',
                    'id': 'as_04asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'No'
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1644,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_04',
                    'id': 'as_04asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'No'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1566,
                    'high': 0
                  },
                  'start': {
                    'low': 1644,
                    'high': 0
                  },
                  'end': {
                    'low': 1014,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1014,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'fieldType': 'binary',
                    'id': 'as_04',
                    'text': 'Do you provide training to key staff on your Anti-Slavery Policy?'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1018,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'fieldType': 'binary',
                'id': 'as_06',
                'text': 'Do you consider implications of slavery on your supply chain when completing due diligence for your own suppliers?'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1569,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1646,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1646,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_06',
                    'id': 'as_06asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'No'
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1646,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_06',
                    'id': 'as_06asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'No'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1570,
                    'high': 0
                  },
                  'start': {
                    'low': 1646,
                    'high': 0
                  },
                  'end': {
                    'low': 1018,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1018,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'fieldType': 'binary',
                    'id': 'as_06',
                    'text': 'Do you consider implications of slavery on your supply chain when completing due diligence for your own suppliers?'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1024,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'fieldType': 'binary',
                'id': 'as_08',
                'text': 'Do you have any links or dealings with any entities in the following countries; Mauritania, Uzbekistan, Haiti, Qatar, India, Pakistan, Democratic Republic of the Congo, Sudan, Syria or the Central African Republic?'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1571,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1647,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1647,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_08',
                    'id': 'as_08asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'No'
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1647,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_08',
                    'id': 'as_08asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'No'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1572,
                    'high': 0
                  },
                  'start': {
                    'low': 1647,
                    'high': 0
                  },
                  'end': {
                    'low': 1024,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1024,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'fieldType': 'binary',
                    'id': 'as_08',
                    'text': 'Do you have any links or dealings with any entities in the following countries; Mauritania, Uzbekistan, Haiti, Qatar, India, Pakistan, Democratic Republic of the Congo, Sudan, Syria or the Central African Republic?'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1025,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'fieldType': 'long-text',
                'id': 'as_09',
                'text': 'Please include details of the country and your activity within it'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1573,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1648,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1648,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_09',
                    'id': 'as_09asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': ''
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1648,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_09',
                    'id': 'as_09asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': ''
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1574,
                    'high': 0
                  },
                  'start': {
                    'low': 1648,
                    'high': 0
                  },
                  'end': {
                    'low': 1025,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1025,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'fieldType': 'long-text',
                    'id': 'as_09',
                    'text': 'Please include details of the country and your activity within it'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1028,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'fieldType': 'binary',
                'id': 'as_10',
                'text': 'Are you providing any services in the operational sectors: Manufacturing, Service and Hospitality, Telecommunications, Extractive Industries, Agriculture?'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1575,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1649,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1649,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_10',
                    'id': 'as_10asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'No'
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1649,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_10',
                    'id': 'as_10asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'No'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1576,
                    'high': 0
                  },
                  'start': {
                    'low': 1649,
                    'high': 0
                  },
                  'end': {
                    'low': 1028,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1028,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'fieldType': 'binary',
                    'id': 'as_10',
                    'text': 'Are you providing any services in the operational sectors: Manufacturing, Service and Hospitality, Telecommunications, Extractive Industries, Agriculture?'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1029,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'text': 'Please provide details',
                'id': 'as_11'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1577,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1650,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1650,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_11',
                    'id': 'as_11asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': ''
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1650,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_11',
                    'id': 'as_11asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': ''
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1578,
                    'high': 0
                  },
                  'start': {
                    'low': 1650,
                    'high': 0
                  },
                  'end': {
                    'low': 1029,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1029,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'text': 'Please provide details',
                    'id': 'as_11'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1032,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'id': 'as_40',
                'text': 'Full Name'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1579,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1651,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1651,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_40',
                    'id': 'as_40asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'Test Supplier Contact'
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1651,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_40',
                    'id': 'as_40asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'Test Supplier Contact'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1580,
                    'high': 0
                  },
                  'start': {
                    'low': 1651,
                    'high': 0
                  },
                  'end': {
                    'low': 1032,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1032,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'id': 'as_40',
                    'text': 'Full Name'
                  }
                }
              }
            ],
            'length': 2
          },
          {
            'start': {
              'identity': {
                'low': 1265,
                'high': 0
              },
              'labels': [
                'Submission'
              ],
              'properties': {
                'surveyId': 'as',
                'supplierId': '',
                'contractId': 'aB4L00000008TYSKA2',
                'id': 'asaB4L00000008TYSKA2',
                'submittedDate': {
                  'low': -427291443,
                  'high': 353
                },
                'type': '',
                'status': 'submitted'
              }
            },
            'end': {
              'identity': {
                'low': 1033,
                'high': 0
              },
              'labels': [
                'SurveyQuestion'
              ],
              'properties': {
                'id': 'as_41',
                'text': 'Job Role'
              }
            },
            'segments': [
              {
                'start': {
                  'identity': {
                    'low': 1265,
                    'high': 0
                  },
                  'labels': [
                    'Submission'
                  ],
                  'properties': {
                    'surveyId': 'as',
                    'supplierId': '',
                    'contractId': 'aB4L00000008TYSKA2',
                    'id': 'asaB4L00000008TYSKA2',
                    'submittedDate': {
                      'low': -427291443,
                      'high': 353
                    },
                    'type': '',
                    'status': 'submitted'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1581,
                    'high': 0
                  },
                  'start': {
                    'low': 1265,
                    'high': 0
                  },
                  'end': {
                    'low': 1652,
                    'high': 0
                  },
                  'type': 'HAS',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1652,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_41',
                    'id': 'as_41asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'Supplier'
                  }
                }
              },
              {
                'start': {
                  'identity': {
                    'low': 1652,
                    'high': 0
                  },
                  'labels': [
                    'SubmissionAnswer'
                  ],
                  'properties': {
                    'questionId': 'as_41',
                    'id': 'as_41asaB4L00000008TYSKA2',
                    'type': 'text',
                    'value': 'Supplier'
                  }
                },
                'relationship': {
                  'identity': {
                    'low': 1582,
                    'high': 0
                  },
                  'start': {
                    'low': 1652,
                    'high': 0
                  },
                  'end': {
                    'low': 1033,
                    'high': 0
                  },
                  'type': 'ANSWERS_QUESTION',
                  'properties': {}
                },
                'end': {
                  'identity': {
                    'low': 1033,
                    'high': 0
                  },
                  'labels': [
                    'SurveyQuestion'
                  ],
                  'properties': {
                    'id': 'as_41',
                    'text': 'Job Role'
                  }
                }
              }
            ],
            'length': 2
          }
        ]
      ],
      '_fieldLookup': {
        'submissions': 0,
        'collect(answers)': 1
      }
    }
  ]
};
exports.getAllForOneParsedResult = { status: 'submitted',
id: 'asaB4L00000008TYSKA2',
as_01: 
 { answer: 'Yes',
   question: 'Does your company have a policy on Anti-Slavery?' },
as_03: 
 { answer: 'steps',
   question: 'Please summarise the steps your company has taken to ensure that slavery and human trafficking is not taking place in its business or supply chains' },
as_02: 
 { answer: '',
   question: 'Please explain the stance your organisation takes on Anti-Slavery' },
as_05: 
 { answer: '',
   question: 'Please describe your Anti-Slavery training' },
as_04: 
 { answer: 'No',
   question: 'Do you provide training to key staff on your Anti-Slavery Policy?' },
as_06: 
 { answer: 'No',
   question: 'Do you consider implications of slavery on your supply chain when completing due diligence for your own suppliers?' },
as_08: 
 { answer: 'No',
   question: 'Do you have any links or dealings with any entities in the following countries; Mauritania, Uzbekistan, Haiti, Qatar, India, Pakistan, Democratic Republic of the Congo, Sudan, Syria or the Central African Republic?' },
as_09: 
 { answer: '',
   question: 'Please include details of the country and your activity within it' },
as_10: 
 { answer: 'No',
   question: 'Are you providing any services in the operational sectors: Manufacturing, Service and Hospitality, Telecommunications, Extractive Industries, Agriculture?' },
as_11: { answer: '', question: 'Please provide details' },
as_40: { answer: 'Test Supplier Contact', question: 'Full Name' },
as_41: { answer: 'Supplier', question: 'Job Role' } };