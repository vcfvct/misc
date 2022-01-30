from asyncio import Semaphore, create_task, gather, run
from httpx import AsyncClient
from time import time

job_count = 40
concurrency = 20

async def get_data(client: AsyncClient, sem: Semaphore, jobId: int):
    async with sem:
        rs = await client.get(url=f"http://localhost:8000?q={jobId}")
        print(rs.text)
        return rs


async def main():
    sem = Semaphore(concurrency)  # no. of simultaneous requests
    start_time = time()
    async with AsyncClient() as client:
        calls = [create_task(get_data(client, sem, job_id)) for job_id in range(job_count)]
        rs = await gather(*calls)
        print(f"'{job_count}' Jobs, Async/await Time taken: '{round(time() - start_time)} seconds' with concurrency: '{concurrency}'")
        # for r in rs:
        # print(r.text)

if __name__ == "__main__":
    run(main())
