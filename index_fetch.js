const fetch = require ('node-fetch');

const http = require ('http');
const port = 5000;
const apiKey = '43XHGE5G5YEZM353AHUDQXTC5SKCYNY9XD';

var server = http.createServer(async (req, res) => {
	switch (req.url) {
		case "/mostChangedBalance":

			console.time("Total");
			var responseString = await countTotalChanges();

			res.writeHead(200, {'Content-Type': 'application/json'});
			res.write(responseString);

			res.end();
			console.timeEnd("Total");

			break;

		default:
        	 
			res.writeHead(404, {'Content-Type': 'application/json'});
			res.write("Page not found.");

			res.end();

			break;
	}
});

server.listen(port);

function decrementHex(hex) {
	return (parseInt("0xd2ea5d", 16) - 1).toString(16);
}

function hexWeiToDecEth(hex) {
	return parseInt(hex, 16)/1000000000000000000;
}

async function countTotalChanges() {

	var response = await fetch('https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apiKey='+apiKey)
		.then((response, _) => response.json())
		.catch(error => error);



	var lastBlock = response.result;

	var lastBlockInfo = await fetch('https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag='+lastBlock+'&boolean=true&apiKey='+apiKey)
		.then((response, _) => response.json())
		.catch(error => error);

	var transactions = new Array();

	transactions = lastBlockInfo.result.transactions;
	
	while (transactions.length < 100) {
		lastBlock = decrementHex(lastBlock);

		var prevBlock = await fetch('https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag='+lastBlock+'&boolean=true&apiKey='+apiKey)
		.then((response, _) => response.json())
		.catch(error => error);

		transactions.push(prevBlock.result.transactions);

	}

	transactions = transactions.slice(0, 100);

	var balances = new Map();

	for (var i = 0; i < transactions.length; i++) {
		
		var trans = transactions[i];
		
		if (trans.to == null) continue;
		
		var transValue = hexWeiToDecEth(trans.value);

		if (!balances.has(trans.from) || balances.get(trans.from) == undefined) {
			balances.set(trans.from, 0);
		}

		balances.set(trans.from, balances.get(trans.from) - transValue);

		if (!balances.has(trans.to) || balances.get(trans.to) == undefined) {
			balances.set(trans.to, 0);
		}

		balances.set(trans.to, balances.get(trans.to) + transValue);
	}	

	balances.forEach((value, key) => {
		balances.set(key, Math.abs(balances.get(key)));
	});

	var sortedBalances = new Map([...balances.entries()].sort((a, b) => b[1] - a[1]));

	var firstItem = sortedBalances.keys().next().value;

	var responseString = "Address: " + firstItem + " with total change of " + sortedBalances.get(firstItem);

	return responseString;
}