import asyncio
from httpx import AsyncClient


async def get_data(client: AsyncClient, sem, jobId):
    async with sem:
        rs = await client.get(url=f"http://localhost:8000?q={jobId}")
        print(rs.text)
        return rs


async def main(jobCount: int):
    sem = asyncio.Semaphore(20)  # no. of simultaneous requests
    async with AsyncClient() as client:
        calls = [asyncio.create_task(get_data(client, sem, jobId)) for jobId in range(jobCount)]
        rs = await asyncio.gather(*calls)
        # for r in rs:
        # print(r.text)


if __name__ == "__main__":
    asyncio.run(main(40))
