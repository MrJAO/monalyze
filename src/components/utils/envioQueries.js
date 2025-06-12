import { request, gql } from 'graphql-request';

const ENDPOINT = 'https://monad-testnet.hypersync.xyz/graphql';

export const fetchTxCount = async (startISO, endISO) => {
  const query = gql`
    query GetTxCount($start: timestamptz!, $end: timestamptz!) {
      blocks(
        where: { timestamp: { _gte: $start, _lt: $end } }
      ) {
        transactions_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  `;

  const variables = {
    start: startISO,
    end: endISO,
  };

  const data = await request(ENDPOINT, query, variables);
  const blocks = data.blocks || [];

  return blocks.reduce(
    (total, b) => total + (b.transactions_aggregate.aggregate?.count || 0),
    0
  );
};
