JOB = {
    "customer_name": "Acme Ltd",
    "pickup_address": "1 Dock Road, Belfast",
    "dropoff_address": "9 High Street, Lisburn",
    "description": "2 pallets",
    "price_pence": 12500,
}


def make_driver(client, name="Sam"):
    return client.post("/drivers", json={"name": name}).json()


def make_job(client):
    r = client.post("/jobs", json=JOB)
    assert r.status_code == 201, r.text
    return r.json()


def test_create_job_starts_created_with_reference_and_event(client):
    job = make_job(client)
    assert job["status"] == "created"
    assert job["reference"] == "JOB-00001"
    detail = client.get(f"/jobs/{job['id']}").json()
    assert [e["to_status"] for e in detail["events"]] == ["created"]


def test_create_job_validates_price(client):
    r = client.post("/jobs", json={**JOB, "price_pence": 0})
    assert r.status_code == 422


def test_full_lifecycle_up_to_completed(client):
    driver = make_driver(client)
    vehicle = client.post("/vehicles", json={"plate": "AB12 CDE"}).json()
    job = make_job(client)
    jid = job["id"]

    r = client.post(
        f"/jobs/{jid}/dispatch", json={"driver_id": driver["id"], "vehicle_id": vehicle["id"]}
    )
    assert r.status_code == 200 and r.json()["status"] == "dispatched"
    assert r.json()["driver"]["name"] == "Sam"
    assert client.post(f"/jobs/{jid}/start").json()["status"] == "in_transit"
    assert client.post(f"/jobs/{jid}/complete").json()["status"] == "completed"

    detail = client.get(f"/jobs/{jid}").json()
    assert [e["to_status"] for e in detail["events"]] == [
        "created",
        "dispatched",
        "in_transit",
        "completed",
    ]


def test_cannot_skip_states(client):
    job = make_job(client)
    r = client.post(f"/jobs/{job['id']}/complete")
    assert r.status_code == 409
    assert client.post(f"/jobs/{job['id']}/start").status_code == 409


def test_dispatch_requires_real_active_driver(client):
    job = make_job(client)
    r = client.post(f"/jobs/{job['id']}/dispatch", json={"driver_id": 999})
    assert r.status_code == 404
    assert client.get(f"/jobs/{job['id']}").json()["status"] == "created"


def test_cannot_dispatch_twice(client):
    driver = make_driver(client)
    job = make_job(client)
    body = {"driver_id": driver["id"]}
    assert client.post(f"/jobs/{job['id']}/dispatch", json=body).status_code == 200
    assert client.post(f"/jobs/{job['id']}/dispatch", json=body).status_code == 409


def test_list_filter_by_status(client):
    driver = make_driver(client)
    a, b = make_job(client), make_job(client)
    client.post(f"/jobs/{a['id']}/dispatch", json={"driver_id": driver["id"]})
    assert [j["id"] for j in client.get("/jobs").json()] == [b["id"], a["id"]]
    assert [j["id"] for j in client.get("/jobs?status=dispatched").json()] == [a["id"]]
    assert client.get("/jobs?status=bogus").status_code == 422


def test_get_missing_job_404(client):
    assert client.get("/jobs/12345").status_code == 404


def test_duplicate_plate_conflict(client):
    assert client.post("/vehicles", json={"plate": "X1"}).status_code == 201
    assert client.post("/vehicles", json={"plate": "X1"}).status_code == 409


def test_health_and_api_key(client, monkeypatch):
    from app.config import settings

    assert client.get("/health").json() == {"ok": True}
    monkeypatch.setattr(settings, "api_key", "secret")
    assert client.get("/jobs").status_code == 401
    assert client.get("/jobs", headers={"X-API-Key": "secret"}).status_code == 200
