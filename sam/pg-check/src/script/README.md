## Async with Semaphore
* use asyncio semaphore to control the concurrency.

## Dependency
`pip3 install httpx --target ./lib`

## Local run
### run local http server
* `node src/script/sever.js`
### run python file
* option 1 in command line: `PYTHONPATH=lib/ python3 src/script/concurrency.py`
* option 2, press `f5` or run `debug` in vscode.