# Decision Making via Data Analysis (SYS-930)

Exploratory data analysis projects that turn raw public data into clear visual evidence for decisions: population patterns across New Jersey and two decades of the Texas housing market.

## Notebooks

| Notebook | What it does | Key result |
|---|---|---|
| [New Jersey Population by County](01_NJpop.ipynb) | Summarises and maps the population of New Jersey's 21 counties. | County populations range from about 66 k to 905 k (Bergen County), with a median of about 449 k. |
| [Texas Housing Market Analysis](02_tx-house-sales.ipynb) | Analyses 5,040 monthly city-level records of Texas home sales: volumes, prices, listings and time on market. | Shows how sales, volume and average price move together over time and which cities are most and least expensive. |

## Tech stack

Python 3 · Jupyter · `pandas` · `matplotlib` · `seaborn` · `geopandas`

## Run it

```bash
pip install -r requirements.txt
jupyter notebook
```

**Data:** the datasets are not included in this repository. You need `NJ.csv` (county populations), `County_Boundaries_of_NJ.geojson` (NJ county boundaries) and `tx-house-sales.csv` (monthly sales by Texas city). Place them next to the notebooks before running.

## About

This work was written by **Hossein Basereh** as part of graduate coursework (SYS-930 Decision Making via Data Analysis) and is shared as a portfolio of applied analysis. If you are taking a similar course, please follow your institution's academic-integrity policy.

## Licence

Copyright © 2023-2026 Hossein Basereh. The code is released under the [MIT License](LICENSE): you may reuse it with attribution, and it is provided "as is", without warranty. Assignment prompts quoted in the notebooks and any third-party datasets remain the property of their original authors and are not covered by this licence.
