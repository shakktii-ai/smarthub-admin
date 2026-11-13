# SMARTHUB PAY - Merchant Admin Dashboard 

Next.js 14 (App Router) + React + JavaScript + Tailwind CSS + Recharts. It is a facade over the
SmartHub Pay FastAPI backend: the `services/` seam (`services/api` for REST, `services/mock` for
local demo) calls real authenticated endpoints, and role access is enforced in `middleware.js`.


## Run
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```


