from flask import Flask, render_template, jsonify, request
import json

app = Flask(__name__)

with open("cases.json", encoding="utf-8") as f:
    TICKETS = json.load(f)

@app.route("/")
def index():
    return render_template("index.html")

@app.get("/api/tickets")
def get_tickets():
    return jsonify([{
        "id": t["id"], "title": t["title"], "area": t["area"],
        "difficulty": t["difficulty"], "user": t["user"],
        "department": t["department"], "priority": t["priority"]
    } for t in TICKETS])

@app.get("/api/tickets/<ticket_id>")
def get_ticket(ticket_id):
    t = next((x for x in TICKETS if x["id"] == ticket_id), None)
    if not t:
        return jsonify({"error": "Ticket not found"}), 404
    return jsonify({
        "id": t["id"], "title": t["title"], "area": t["area"],
        "difficulty": t["difficulty"], "user": t["user"],
        "department": t["department"], "priority": t["priority"],
        "description": t["description"], "symptoms": t["symptoms"],
        "questions": t["questions"],
        "tools": {k: {"name":v["name"],"description":v["description"]} for k,v in t["tools"].items()},
        "hypotheses": t["hypotheses"]
    })

@app.get("/api/tickets/<ticket_id>/tools/<tool_id>")
def run_tool(ticket_id, tool_id):
    t = next((x for x in TICKETS if x["id"] == ticket_id), None)
    if not t or tool_id not in t["tools"]:
        return jsonify({"error":"Tool not found"}),404
    return jsonify(t["tools"][tool_id])

@app.post("/api/tickets/<ticket_id>/submit")
def submit(ticket_id):
    t = next((x for x in TICKETS if x["id"] == ticket_id), None)
    if not t:
        return jsonify({"error":"Ticket not found"}),404
    data = request.get_json(silent=True) or {}
    hypothesis = data.get("hypothesis")
    reasoning = (data.get("reasoning") or "").strip()
    if not any(h["id"] == hypothesis for h in t["hypotheses"]):
        return jsonify({"error":"Invalid hypothesis"}),400

    correct = hypothesis == t["answer"]

    keyword_map = {
        "dns":["dns","resolution","resolver","name"],
        "memory":["memory","ram","process"],
        "credentials":["password","credential","authentication","auth"],
        "queue":["queue","print","job"],
        "olddevice":["old","laptop","password","device"],
        "group":["group","permission","marketing"],
        "offline":["offline","outlook","sync"],
        "teamsdevice":["microphone","teams","device"],
        "driver":["driver","update"],
        "dock":["dock","displayport","display"],
        "expiry":["expired","password"],
        "file":["corrupt","dll","file"],
        "service":["service","port","agent"],
        "compromise":["unknown","login","mfa","risk"],
        "process":["process","cpu","backup"],
        "portal":["portal","admin","policy"],
        "version":["version","history","restore"],
        "policy":["policy","dns","route","profile"]
    }
    hits=sum(1 for word in keyword_map.get(hypothesis,[]) if word in reasoning.lower())
    score=(100 if correct else -50) + min(hits*15,45)
    if len(reasoning)<25:
        score-=15

    return jsonify({
        "correct":correct,
        "score":score,
        "feedback":t["explanation"] if correct else "That hypothesis is not the best match for the evidence. Re-check what your tests proved and what they ruled out.",
        "coach":("Strong reasoning: you connected your diagnosis to evidence."
                 if hits >= 2 else
                 "Your reasoning needs a clearer evidence chain. Mention the specific test result that supports your hypothesis and what it rules out.")
    })

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
