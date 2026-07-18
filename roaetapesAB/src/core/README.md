# core

Business logic and domain rules live here, independent of React, the database
and any external provider. Domain modules (leads, appointments, availability,
work orders, conversations) currently live under `src/data` and
`src/integrations`; this folder is reserved for framework-independent rules.
