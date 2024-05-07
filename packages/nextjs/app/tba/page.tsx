"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useAccount, useContractWrite } from "wagmi";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const CHAIN_ID = "31337";
const kudzuContract = "0x94E84f2DBB9b068eA01DB531E7343ec2385B7052";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  const { data: yourKudzuTokenId } = useScaffoldContractRead({
    contractName: "KUDZU",
    functionName: "tokenOfOwnerByIndex",
    args: [connectedAddress, 0n],
  });

  const [addressToInfect, setAddressToInfect] = useState<string>("");

  const [addressToPubInfect, setAddressToPubInfect] = useState<string>("");

  const { data: tbaAddress } = useScaffoldContractRead({
    contractName: "ERC6551Registry",
    functionName: "account",
    args: [
      deployedContracts[CHAIN_ID].ERC6551Account.address,
      BigInt(CHAIN_ID),
      kudzuContract,
      yourKudzuTokenId,
      BigInt("0"),
    ],
  });

  // const { writeAsync: pubInfectFromYourKudzu } = useScaffoldContractWrite({
  //   contractName: "BasedKudzuContainerForSale",
  //   functionName: "publiclyInfect",
  //   args: [addressToPubInfect],
  // });

  const { writeAsync: pubInfectFromTBAKudzu } = useContractWrite({
    address: tbaAddress,
    abi: deployedContracts[CHAIN_ID].ERC6551Account.abi,
    functionName: "publiclyInfect",
    args: [addressToPubInfect],
  });

  const { writeAsync: infectFromYourKudzu } = useScaffoldContractWrite({
    contractName: "KUDZU",
    functionName: "safeTransferFrom",
    // @ts-ignore
    args: [connectedAddress, addressToInfect, yourKudzuTokenId || 0n],
  });

  const { data: alreadyHasKudzu } = useScaffoldContractRead({
    contractName: "KUDZU",
    functionName: "tokenOfOwnerByIndex",
    args: [addressToPubInfect, 0n],
  });

  const { writeAsync: deployContainer } = useScaffoldContractWrite({
    contractName: "BasedKudzuContainerForSaleFactory",
    functionName: "create",
    args: [connectedAddress],
    value: parseEther("0.00005"),
  });

  const { writeAsync: createAccount } = useScaffoldContractWrite({
    contractName: "ERC6551Registry",
    functionName: "createAccount",
    args: [
      deployedContracts[CHAIN_ID].ERC6551Account.address,
      BigInt(CHAIN_ID),
      kudzuContract,
      yourKudzuTokenId,
      BigInt("0"),
      "0x",
    ],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
      console.log(txnReceipt);
    },
  });

  const router = useRouter();
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <p>{yourKudzuTokenId?.toString()} yourKudzuTokenId</p>
        <div className="px-5">
          infect address from infector contract:{" "}
          <AddressInput
            placeholder="0xYourAddress"
            value={addressToPubInfect}
            onChange={v => setAddressToPubInfect(v)}
          />
          {alreadyHasKudzu ? (
            <p className="text-red-500">
              <a
                target="_blank"
                href={"https://opensea.io/assets/base/0x94e84f2dbb9b068ea01db531e7343ec2385b7052/" + alreadyHasKudzu}
              >
                {" "}
                This address already has a Kudzu here!
              </a>
            </p>
          ) : (
            ""
          )}
          <button
            className="btn btn-secondary"
            onClick={() => {
              pubInfectFromTBAKudzu();
            }}
          >
            🦠 infect
          </button>
        </div>
      </div>
      <div className="divider p-12"></div>
      {yourKudzuTokenId && (
        <div className="flex items-center flex-col flex-grow pt-10">
          <h1 className="text-center">
            <div className="content-center"> 🦠 YOU ARE INFECTED WITH KUDZU:</div>
            <div className="flex content-center">
              <div className="content-center">
                {" "}
                <img
                  alt="virus"
                  style={{ maxWidth: 250 }}
                  src={"https://virus.folia.app/img/base/" + yourKudzuTokenId?.toString()}
                />
              </div>
            </div>
          </h1>
          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">TBA Address:</p>
            <Address address={tbaAddress} />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => {
              createAccount();
            }}
          >
            Create Factory
          </button>

          <AddressInput value={addressToInfect} onChange={v => setAddressToInfect(v)} placeholder="0xSomeAddress" />

          <button
            className="btn btn-secondary"
            onClick={() => {
              infectFromYourKudzu();
            }}
          >
            🦠 infect from your kudzu
          </button>
          <div className="divider p-12"></div>
        </div>
      )}
      <div className="flex items-center flex-col flex-grow pt-10">
        <div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              router.push("/buy");
            }}
          >
            💵 buy kudzu containers
          </button>
        </div>
        <div className="divider p-12"></div>
        <div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              deployContainer();
            }}
          >
            🧫 deploy a kudzu container smart contract
          </button>
        </div>
        <div className="divider p-12"></div>
        <div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              router.push("/debug");
            }}
          >
            📄 smart contracts
          </button>
        </div>
      </div>
    </>
  );
};

export default Home;
