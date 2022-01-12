const axios = require ('axios').default;
const util = require ('util');

const express = require('express');
const app = express();
const port = 5000;

const apiKey = '43XHGE5G5YEZM353AHUDQXTC5SKCYNY9XD';

app.get('/mostChangedBalance', async (req, res) => {
	console.time('Total');
	const responseString = await countTotalChanges();
	res.status(200).send(responseString);
	console.timeEnd('Total');

})

app.get('*', (req, res) => res.status(404).send("404 PAGE NOT FOUND"));

app.listen(port);


function decrementHex(hex) {
	return (parseInt(hex, 16) - 1).toString(16);
}

function hexWeiToDecEth(hex) {
	return parseInt(hex, 16)/1000000000000000000;
}

async function countTotalChanges() {

	const response = await axios('https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apiKey='+apiKey)
		.catch(error => error);

	let lastBlock = response.data.result;

	const lastBlockInfo = await axios('https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag='+lastBlock+'&boolean=true&apiKey='+apiKey)
		.catch(error => error);

	let transactions = new Array();

	transactions = lastBlockInfo.data.result.transactions;	

	let millis = 0;
	for (let i = 0; i < 100; i++) {
		
		const startTime = process.hrtime();
		lastBlock = decrementHex(lastBlock);

		const prevBlock = await axios('https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag='+lastBlock+'&boolean=true&apiKey='+apiKey)
			.catch(error => error);

		console.log("Finished request #" + (i+1));

		if (prevBlock.data.hasOwnProperty('status')) {
			if (prevBlock.data.status == 0) {
				console.log("API timeout");
			}
		}

		transactions.push(...prevBlock.data.result.transactions);

		const diffTime = process.hrtime(startTime);

		millis += Math.ceil(diffTime[1]/1000000);

		if ((i + 1) % 3 == 0) {
			if (millis < 1000) {
				let sleep = (delay) => new Promise(resolve => setTimeout(resolve, delay), reject => console.log("Error occured during delay"));
				await sleep(1000-millis);
			}

			millis = 0;
			
		}
	}

	let balances = new Map();


	for (let i = 0; i < transactions.length; i++) {
		

		const trans = transactions[i];
		
		if (trans.to == null) continue;
		
		const transValue = hexWeiToDecEth(trans.value);

		if (!balances.has(trans.from) || balances.get(trans.from) === undefined) {
			balances.set(trans.from, 0);
		}

		balances.set(trans.from, balances.get(trans.from) - transValue);

		if (!balances.has(trans.to) || balances.get(trans.to) === undefined) {
			balances.set(trans.to, 0);
		}

		balances.set(trans.to, balances.get(trans.to) + transValue);
	}
	

	balances.forEach((value, key) => {
		balances.set(key, Math.abs(balances.get(key)));
	});

	const sortedBalances = new Map([...balances.entries()].sort((a, b) => b[1] - a[1]));

	const firstItem = sortedBalances.keys().next().value;

	const responseString = "Address: " + firstItem + " with total change of " + sortedBalances.get(firstItem);

	console.log("Total transactions: " + transactions.length);

	return responseString;
}