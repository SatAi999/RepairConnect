# ♻️ RepairConnect: The Circular Economy Hub for Electronics Lifecycle

> **"Urban Company starts when the customer knows what service they need. RepairConnect starts when they don't."**

RepairConnect is a production-ready, hackathon-winning lifecycle platform for consumer electronics. It bridges the gap between diagnostic uncertainty, physical technician verification, and responsible circular recovery.

---

## 📌 The Problem & The Mission

### The E-Waste Crisis
Every year, millions of tons of functional and non-functional electronics are discarded blindly. When a consumer's device fails, they face an asymmetric choice: pay an unknown repair price, or sell it to a local informal scrap dealer for pennies. 

### The Hidden Value
A "dead" product is rarely completely valueless. It contains:
1. **Reusable Components**: Working RAM, SSDs, displays, cameras, and power supplies.
2. **Recoverable Raw Materials**: Copper, aluminium, steel, and plastics.
3. **Refurbishment Potential**: Products that are economically impractical for a single consumer to repair but highly valuable for refurbishers to rebuild.

### The RepairConnect Solution
RepairConnect guides the customer through a verified, evidence-based pathway:
```text
PRODUCT → CUSTOMER REPORT → AI/VISION ASSISTED DIAGNOSIS → TECHNICIAN GATEKEEPER → REPAIR
                                                                                     ↓ (If Beyond Repair)
                                                                             RECOVERY MARKETPLACE
```

---

## ⚡ Key Core Features (V2 Intelligence Modules)

### 1. The Technician Gatekeeper (Critical Business Rule)
AI or customers can **never** independently declare a product "scrap". To prevent fraud and preserve device lifespans, the Circular Recovery marketplace unlocks **only** when an assigned repair professional explicitly submits a decision:
* `BEYOND_REPAIR`
* `ECONOMICALLY_IMPRACTICAL`
* `CUSTOMER_DECLINED_REPAIR`
This action creates a permanent, signed **Technician Inspection Report** with evidence photos and affected component logs.

### 2. Live YOLOv11 & OCR Vision Engine
Powered by a dedicated **Python FastAPI Vision Service** running in a PyTorch virtual environment:
* **YOLOv11 Object Detection**: Identifies products and structural damages.
* **OpenCV Image Quality**: Evaluates blur (Laplacian variance) and average brightness before processing.
* **Tesseract OCR**: Extracts serial numbers, model plates, and brands to auto-populate metadata without hallucination.
* **Graceful Fallback**: Bypasses network or service drops smoothly using simulated Node.js predictions.

### 3. Interactive Q&A Decision Trees & Safety Gate
* Rule-based diagnostic trees for **Air Conditioners, Laptops, Ceiling Fans, Washing Machines, Refrigerators, and Smartphones**.
* **Safety Gate**: Instantly blocks diagnostics and shows emergency fullscreen alerts if safety-critical indicators (burning smell, sparks, exposed wire, battery swelling) are selected.
* **Speech-to-Text Input**: Integrates with the browser's Web Speech API to capture verbal symptom answers.

### 4. Circular Recovery Center & Marketplace
* **circulatory Hierarchy Visual**: Displays a signature status flow showing current case position:
  `🔧 REPAIR` $\rightarrow$ `🔄 REUSE` $\rightarrow$ `🛠 REFURBISH` $\rightarrow$ `🧩 COMPONENT RECOVERY` $\rightarrow$ `♻️ RECYCLING` $\rightarrow$ `⚪ DISPOSAL`.
* **Indicative Valuation Engine**: Calculates estimated value boundaries using weight mix factors and configurable market rates (with explicit `DEMO DATA` labeling).
* **Live Partner Bidding**: Real recyclers, refurbishers, and dismantlers submit custom offers.
* **Comparison Engine**: Calculates `Net Value = Offer Amount - Pickup Fee` and sorts options.

### 5. Product Passport & Digital Certificates
* **Product Passport**: An immutable ledger tracking a product's entire history: Registration, Diagnosis, Repair Attempts, Beyond Repair Confirmation, Component Salvage, and Recycling completion.
* **Recovery Certificate**: A signed digital certificate containing verified pickup weights, partner timestamps, and circular pathways to prove responsible landfill diversion.

---

## 🏗 System Architecture & Stack

```text
                                  +-------------------+
                                  |   React Client    |
                                  |    (Port 5188)    |
                                  +---------+---------+
                                            | HTTP / REST
                                            v
                                  +-------------------+
                                  |   Express Server  |
                                  |    (Port 5005)    |
                                  +----+----+----+----+
                                       |    |    |
                 +---------------------+    |    +---------------------+
                 | Mongoose                 | fetch                    | Google AI SDK
                 v                          v                          v
     +-----------------------+   +-----------------------+   +-------------------+
     |  MongoDB Atlas Shard  |   | Python Vision Service |   |  Gemini 1.5 Flash |
     |      (Mongoose 8)     |   |      (Port 5010)      |   |  (Demo Fallback)  |
     +-----------------------+   +-----------------------+   +-------------------+
                                 |  YOLOv11 & OCR Engine |
                                 +-----------------------+
```

* **Frontend**: React 18, TypeScript, Tailwind CSS, Leaflet Maps, Lucide icons, Axios.
* **Backend**: Node.js, Express, TypeScript, Mongoose 8.
* **AI & CV**: FastAPI (Uvicorn), PyTorch, Ultralytics YOLOv11, OpenCV, Pytesseract OCR.

---

## ⚙️ Quickstart & Local Installation

### Prerequisites
* **Node.js** (v18+)
* **MongoDB** (Atlas connection recommended)
* **Python** (v3.10+) with `tesseract` binary installed on system PATH

### 1. Clone & Install Dependencies
```bash
# Clone the repo
git clone https://github.com/SatAi999/RepairConnect.git
cd RepairConnect

# Install Backend dependencies
cd server
npm install

# Install Frontend dependencies
cd ../client
npm install
```

### 2. Environment Configurations
Create `.env` inside `server/`:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5005
CLIENT_URL=http://localhost:5188
AI_API_KEY=your_gemini_api_key
DEMO_MODE=false
```

Create `.env` inside `client/`:
```env
VITE_API_URL=http://localhost:5005/api
```

### 3. Database Seeding
Populate base materials, repair shops, and demo partners:
```bash
cd server
npm run seed
```

### 4. Running the Applications
```bash
# Start Backend (server/):
npm run dev

# Start Frontend (client/):
npm run dev

# Start Python Vision Engine (D:/Computer_Vision/):
D:\Computer_Vision\venv\Scripts\python.exe D:\Computer_Vision\vision_service.py
```

---

## 🧪 Testing Suites
Run automated verification tests:
```bash
# Run Backend Unit Tests
npm run test:unit --prefix server

# Run Backend API Integration Tests
npm run test:api --prefix server

# Run Playwright E2E User Journey Tests
npx playwright test
```

---

## 🏆 3-Minute Perfect Hackathon Demo Flow
1. **Customer Registers Repair Case**: Logs in as `customer@example.com` (`password123`) $\rightarrow$ clicks **Analyze Device** $\rightarrow$ uploads image $\rightarrow$ triggers diagnosis.
2. **Visual Inspection & Diagnostics**: Runs YOLO visual scan, and clicks **Start Diagnostics** Q&A.
3. **Technician Gatekeeper Audit**: Logs in as `quickfix@example.com` (`password123`) $\rightarrow$ views the customer request in queue $\rightarrow$ clicks **Record Physical Inspection** $\rightarrow$ selects **Beyond Repair** $\rightarrow$ submits.
4. **Circularity Pathways**: Customer views case $\rightarrow$ enters **Recovery Center** $\rightarrow$ sees **Circularity Hierarchy** visual showing Repair (❌), Components (🟢) $\rightarrow$ reviews 3 demo buyer bids $\rightarrow$ clicks **Accept Offer**.
5. **Logistics Handover**: Recycler partner logs in (`demorecycler@example.com` / `password123`) $\rightarrow$ marks pickup status as **Completed** and enters verified scale weight.
6. **Certificate Generated**: Customer prints the **Recovery Certificate** showing the e-waste diversion record.
