from fastapi import Depends, FastAPI

from app.api import jobs, resources
from app.api.deps import require_api_key

app = FastAPI(title="Tamago", version="0.1.0")

for router in (jobs.router, resources.drivers, resources.vehicles, resources.invoices):
    app.include_router(router, dependencies=[Depends(require_api_key)])


@app.get("/health")
def health():
    return {"ok": True}
