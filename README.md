# 📊 DataMine Apriori Analytics

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/zustand-%2320232a.svg?style=for-the-badge&logo=react&logoColor=white)
![Recharts](https://img.shields.io/badge/recharts-%2322B573.svg?style=for-the-badge&logo=react&logoColor=white)

**DataMine Apriori Analytics** is a professional, interactive Data Mining Dashboard built to discover hidden patterns and association rules in transactional datasets using the **Apriori Algorithm**. Designed with a modern UI and robust analytics features, this tool empowers users to extract actionable insights for market basket analysis, product recommendations, and business strategy optimization.

---

## ✨ Features

- **🚀 Interactive Dashboard**: A sleek, responsive, and modern user interface providing at-a-glance insights into data mining results.
- **📂 Flexible Data Import**: Easily import your transaction data via `.xlsx` or `.csv` files. Supports multiple data formats (Long Format & Wide/Basket Format).
- **⚙️ Customizable Apriori Parameters**: Dynamically adjust **Minimum Support** and **Minimum Confidence** thresholds to fine-tune the algorithm's sensitivity and precision.
- **📈 Advanced Visualizations**: 
  - Scatter plots for Support vs. Confidence analysis.
  - Network graphs displaying relationship dynamics between itemsets.
  - Detailed, sortable, and filterable data tables for extracted rules.
- **📄 Report Generation**: Export your generated association rules and analytical reports directly to PDF for sharing and documentation.

## 🛠️ Technology Stack

- **Frontend Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (v4) & Radix UI Primitives
- **State Management:** Zustand
- **Data Visualization:** Recharts
- **Data Processing:** SheetJS (xlsx) for file parsing
- **Exporting:** html2canvas & jsPDF

## 🚀 Getting Started

Follow these steps to run the application locally on your machine.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v16 or higher is recommended).

### Installation

1. Clone the repository or extract the project folder:
   ```bash
   git clone <repository-url>
   cd caca
   ```

2. Install the required dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

## 📖 How to Use

1. **Import Data:** Navigate to the "Data Import" section and upload your `.xlsx` or `.csv` transaction dataset. Ensure your data has clear Transaction IDs and Item columns.
2. **Set Parameters:** Adjust the Minimum Support (e.g., 10%) and Minimum Confidence (e.g., 50%) sliders according to your analytical needs.
3. **Run Analysis:** Click "Generate Rules" to execute the Apriori algorithm.
4. **Explore Insights:** Use the dashboard widgets, network graphs, and tables to interpret the generated rules (Antecedent -> Consequent).
5. **Export:** Click the export button to save your findings as a PDF report.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

## 📜 License

This project is licensed under the MIT License.