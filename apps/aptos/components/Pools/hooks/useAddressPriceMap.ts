import _get from 'lodash/get'
import _toString from 'lodash/toString'
import _partition from 'lodash/partition'

import _toNumber from 'lodash/toNumber'
import { useMemo } from 'react'

import { PairState, usePairs } from 'hooks/usePairs'
import { APT, L0_USDC } from 'config/coins'
import { Pair } from '@pancakeswap/aptos-swap-sdk'

import splitTypeTag from '../utils/splitTypeTag'
import getTokenByAddress from '../utils/getTokenByAddress'
import { getPriceInUSDC } from '../utils/getPriceInUSDC'

function getPossibleLPAddresses({ pools, chainId }) {
  if (!pools?.length) return []

  const coinAddresses = pools.reduce((list, resource) => {
    const [stakingAddress, earningAddress] = splitTypeTag(resource.type)

    const updatedList = list

    if (!updatedList.includes(stakingAddress)) {
      updatedList.push(stakingAddress)
    }

    if (!updatedList.includes(earningAddress)) {
      updatedList.push(earningAddress)
    }

    return updatedList
  }, [])

  // Pair all addresses with potential Stable or Native ones

  const pairs = coinAddresses.reduce(
    (results, address) => {
      const coin = getTokenByAddress({ chainId, address })

      if (!coin) return results

      return [...results, [coin, APT[chainId]], [coin, L0_USDC[chainId]]]
    },
    [[APT[chainId], L0_USDC[chainId]]],
  )

  return pairs
}

export default function useAddressPriceMap({ pools, chainId }) {
  const usdcCoin = L0_USDC[chainId]

  const relevantPairs = getPossibleLPAddresses({ pools, chainId })

  const pairsInfo = usePairs(relevantPairs)

  const availablePairs = useMemo(
    () => pairsInfo.filter(([status]) => status === PairState.EXISTS).map(([, pair]) => pair as Pair),
    [pairsInfo],
  )

  if (!availablePairs?.length) return []

  const prices = {}

  availablePairs.forEach((pair) => {
    const token0 = pair?.token0
    const token1 = pair?.token1

    if (token0.address === usdcCoin.address || token1.address === usdcCoin.address) return

    if (token0 && !prices[token0?.address]) {
      prices[token0?.address] = getPriceInUSDC({
        tokenIn: token0,
        availablePairs,
        usdcCoin,
      })
    }

    if (token1 && !prices[token1?.address]) {
      prices[token1?.address] = getPriceInUSDC({
        tokenIn: token1,
        availablePairs,
        usdcCoin,
      })
    }
  })

  return prices
}
