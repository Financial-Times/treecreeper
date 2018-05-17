exports.emptySubmissions = [{
  _fields: [
    {
      properties: {id: 'submission123'}
    }
  ]
}];

exports.submissionsToCloneFrom = [
  {
    'keys': [
      'submissions'
    ],
    'length': 1,
    '_fields': [
      {
        'start': {
          'identity': {
            'low': 1261,
            'high': 0
          },
          'labels': [
            'Supplier'
          ],
          'properties': {
            'name': 'Teja Thomas Ltd',
            'id': 'a0zL0000004cggHIAQ'
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
                'low': 1261,
                'high': 0
              },
              'labels': [
                'Supplier'
              ],
              'properties': {
                'name': 'Teja Thomas Ltd',
                'id': 'a0zL0000004cggHIAQ'
              }
            },
            'relationship': {
              'identity': {
                'low': 1301,
                'high': 0
              },
              'start': {
                'low': 1261,
                'high': 0
              },
              'end': {
                'low': 1263,
                'high': 0
              },
              'type': 'SIGNS',
              'properties': {}
            },
            'end': {
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
            }
          },
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
                  'low': -408631462,
                  'high': 353
                },
                'type': '',
                'status': 'resubmitted'
              }
            }
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
                  'low': -408631462,
                  'high': 353
                },
                'type': '',
                'status': 'resubmitted'
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
        'length': 4
      }
    ],
    '_fieldLookup': {
      'submissions': 0
    }
  }
];