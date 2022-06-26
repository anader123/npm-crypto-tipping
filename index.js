const NpmApi = require("npm-api");
const { ethers } = require("ethers");
const inquirer = require("inquirer");
const qrcode = require("qrcode-terminal");
const EthereumQRPlugin = require("ethereum-qr-code");

const getPaymentAddress = async (packageName) => {
  const npm = new NpmApi();
  try {
    const repo = await npm.repo(packageName).package();
    const paymentAddress = repo.ethereum;
    if (paymentAddress !== undefined) {
      if (paymentAddress.includes(".eth")) {
        const ETH_RPC = "https://cloudflare-eth.com";
        const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);

        const paymentAddressFinal = await provider.resolveName(paymentAddress);
        return paymentAddressFinal;
      }
      return paymentAddress;
    } else {
      console.log("Error: No Ethereum address found for the package.");
      return;
    }
  } catch (error) {
    console.log("Error: No npm package found with that name.");
    return undefined;
  }
};

const generateTransaction = async (packageName, amount, chainId, network) => {
  const paymentAddress = await getPaymentAddress(packageName);
  const rawAmount = ethers.utils.parseEther(amount.toString());

  const qr = new EthereumQRPlugin();
  const result = qr.toAddressString({
    to: paymentAddress,
    value: rawAmount,
    chainId,
  });

  qrcode.generate(result, {
    small: true,
  });
  console.log(`Send ${amount} to ${paymentAddress} on ${network}`);
};

const questions = [
  {
    type: "string",
    name: "packageName",
    message: "Name of the npm package:",
  },
  {
    type: "string",
    name: "network",
    message: "Network to send funds on. Options: ETH or OP",
  },
  {
    type: "number",
    name: "amount",
    message: "ETH amount to tip:",
  },
];

inquirer.prompt(questions).then((answers) => {
  const { packageName, amount, network } = answers;
  if (!isNaN(amount)) {
    let chainId;

    switch (true) {
      case network.toLowerCase() === "eth":
        chainId = 1;
      case network.toLowerCase() === "op":
        chainId = 10;
    }

    if (chainId === undefined) {
      console.log("Error: Invalid network option entered.");
      return;
    }

    generateTransaction(packageName, amount, chainId, network);
  } else {
    console.log("Error: Invalid amount entered, please enter in a number.");
    return;
  }
});
