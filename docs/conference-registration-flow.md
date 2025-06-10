# Conference Registration & Payment Flow (Visual)

```mermaid
graph TD
    A[User (Public)] -- View Conferences --> B[GET /events/public/conferences]
    B -- List of Conferences (with registration status) --> A
    A -- Check Registration Status (Debug) --> C[GET /events/public/registration-status/:slug]
    C -- Registration Status Info --> A
    A2[User (Logged In)] -- Initiate Payment --> D[POST /events/pay/:slug]
    D -- Checks registration period & user status --> E{Registration Open?}
    E -- No --> F[Error: Registration Closed]
    E -- Yes --> G[Find Payment Plan]
    G -- Initiate Payment (Paystack/PayPal) --> H[Return Payment URL/Order]
    A2 -- Complete Payment --> I[POST /events/confirm-payment]
    I -- Verify & Register User --> J[User Registered for Conference]
```

---

- **Green boxes**: User actions
- **Blue boxes**: API endpoints
- **Diamonds**: Decision points
- **Gray boxes**: System actions/results

> You can view this diagram using a Mermaid live editor (https://mermaid-js.github.io/mermaid-live-editor/) or a Markdown viewer that supports Mermaid.
