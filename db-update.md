# Forces OS ⇌ Brief Engine Integration Spec
**(Updated for Direct Supabase Vault Architecture)**

## Architecture Overview
The Brief Engine will no longer dispatch webhooks to transient/local environments. Instead, the remote Python architecture will operate as a direct **Data Vault Writer**. 

When the Brief Engine completes a targeted research task, it will execute a direct `INSERT` query into the Unified Supabase database (the same secure database that safely houses Plasma CRM and Model Delights). The Forces OS interactive canvas will natively subscribe to this Supabase table for instant, global, real-time geometric eruption.

---

## 1. The Handoff (Forces -> Brief)

Forces OS will dispatch a request to the Brief Engine matching this payload:

**POST `https://brief.delights.pro/api/research/dispatch`**
```json
{
  "query": "Deep dive into Quantum Consciousness intersections with BCI hardware",
  "node_id": "shape:dossier-node-12345",
  "format": "spatial_json",
  "depth": "rapid" 
}
```

*Note: The `webhook_url` parameter has been officially deprecated. The Brief Engine must accept the `node_id` and cache it internally while running the long-polling research loop.*

---

## 2. The Payload Drop (Brief -> Supabase)

Upon gathering and synthesizing the Exa/Haiku data into the required `spatial_payload`, the Python Brief Engine MUST execute a direct insert into the Unified Supabase database.

### Supabase Core Credentials
Ensure the Python environment is loaded with the following secure keys to bypass downstream RLS policies:
- **SUPABASE_URL:** `https://gyjqbdhyxywlyzvwnwff.supabase.co`
- **SUPABASE_SERVICE_ROLE_KEY:** `<REDACTED_SECURE_KEY_STORED_IN_ENV>`

### Target Table Schema
**Table Name:** `great_crm_brief_dossiers`

You must `INSERT` a single row formatted with the following columns:
- `node_id` (String) - The exact string passed during The Handoff. 
- `spatial_payload` (JSONB) - The fully validated spatial geometry output.

### 3. Required spatial_payload Structure
The inserted `spatial_payload` JSONB object must rigorously conform to this UI schema:

```json
{
  "core_thesis": "A 1-sentence executive summary of the gathered research.",
  "insights": [
    {
      "title": "Short catchy title",
      "description": "Deep tactical implication of the insight",
      "color": "blue" 
    }
  ],
  "risks": [
     {
      "title": "Identified Risk",
      "description": "Details of the competitor/market risk",
      "color": "red" 
    }
  ],
  "key_quotes": [
    "Raw text quote pulled directly from a Reddit AMA, G2 review, or technical doc."
  ],
  "anomalies": [
     {
      "title": "Weird Signal",
      "description": "Something strange the drone noticed that doesn't fit the standard narrative.",
      "color": "orange" 
    }
  ]
}
```

### Python SDK Implementation Example
```python
from supabase import create_client, Client
import os

url: str = "https://gyjqbdhyxywlyzvwnwff.supabase.co"
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")  # Use the Service Role Key provided above
supabase: Client = create_client(url, key)

# After Haiku finishes generating the JSON dict:
data, count = supabase.table('great_crm_brief_dossiers').insert({
    "node_id": requested_node_id,
    "spatial_payload": generated_json_dict
}).execute()
```

---
## The Canvas Response (Supabase -> Forces)
Zero action is required from the Brief Engine team after the insert executes. 

The Forces OS React frontend maps a `supabase.channel('research').on('postgres_changes')` listener directly to the `great_crm_brief_dossiers` table. Milliseconds after the Python drone commits the row, the websocket fires, the Forces GUI consumes the newly generated JSON, and the architectural components geometrically explode onto the Tldraw canvas.
