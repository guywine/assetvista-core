import { Asset, FXRates, PortfolioSnapshot } from '@/types/portfolio';
import { calculateAssetValue, formatCurrency } from './portfolio-utils';
import * as XLSX from 'xlsx-js-style';

// Entity order as specified by user
const ENTITY_ORDER = ['Hagit', 'Roy', 'Guy', 'Roni', 'Shimon', 'Weintraub', 'SW2009', 'B Joel', 'Tom'];

// Asset class and sub-class ordering
const CLASS_ORDER = [
  { class: 'Cash', subClasses: ['Cash'] },
  { 
    class: 'Fixed Income', 
    subClasses: ['Bank Deposit', 'Money Market', 'Gov 1-2', 'Gov long', 'CPI linked', 'Corporate', 'REIT stock', 'Private Credit']
  },
  { 
    class: 'Public Equity', 
    subClasses: ['Big Tech', 'China', 'other']
  },
  { 
    class: 'Commodities & more', 
    subClasses: ['Cryptocurrency', 'Commodities']
  },
  {
    class: 'Real Estate',
    subClasses: ['Tel-Aviv', 'Living', 'Abroad']
  }
];

// Styling constants
export const HEADER_STYLE = {
  font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '4472C4' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  }
};

export const DATA_STYLE = {
  font: { name: 'Arial', sz: 10 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } }
  }
};

export const ALTERNATE_ROW_STYLE = {
  ...DATA_STYLE,
  fill: { fgColor: { rgb: 'F8F9FA' } }
};

export const TOTAL_ROW_STYLE = {
  ...DATA_STYLE,
  font: { name: 'Arial', sz: 11, bold: true },
  fill: { fgColor: { rgb: 'FFE699' } }
};

export const SUBTOTAL_ROW_STYLE = {
  ...DATA_STYLE,
  font: { name: 'Arial', sz: 10, bold: true },
  fill: { fgColor: { rgb: 'FFF2CC' } }
};

interface AssetGroup {
  name: string;
  currency: string;
  price: number;
  class: string;
  subClass: string;
  entityQuantities: { [entity: string]: number };
  totalQuantity: number;
  totalUSD: number;
  totalILS: number;
}

// Group assets by name (excluding specified classes)
function groupAssetsByName(assets: Asset[], excludeClasses: string[], fxRates: FXRates): AssetGroup[] {
  const groups = new Map<string, AssetGroup>();
  
  const filteredAssets = assets.filter(a => !excludeClasses.includes(a.class));
  
  filteredAssets.forEach(asset => {
    const key = asset.name;
      const calc = calculateAssetValue(asset, fxRates, 'USD');
    
    if (!groups.has(key)) {
      groups.set(key, {
        name: asset.name,
        currency: asset.origin_currency,
        price: asset.price,
        class: asset.class,
        subClass: asset.sub_class,
        entityQuantities: {},
        totalQuantity: 0,
        totalUSD: 0,
        totalILS: 0
      });
    }
    
    const group = groups.get(key)!;
    const entity = asset.account_entity;
    
    group.entityQuantities[entity] = (group.entityQuantities[entity] || 0) + asset.quantity;
    group.totalQuantity += asset.quantity;
    group.totalUSD += calc.converted_value;
    
    // Calculate ILS value
    const ilsCalc = calculateAssetValue(asset, fxRates, 'ILS');
    group.totalILS += ilsCalc.converted_value;
  });
  
  return Array.from(groups.values());
}

// Build smart summary data with subtotals and totals
export function buildSmartSummaryData(assets: Asset[], fxRates: FXRates): any[] {
  const groups = groupAssetsByName(assets, ['Private Equity'], fxRates);
  const rows: any[] = [];
  
  // Header row
  const headers = ['Asset Name', 'Currency', 'Price', ...ENTITY_ORDER, 'Total Qty', 'Total USD', 'Total ILS'];
  rows.push(headers);
  
  let grandTotalUSD = 0;
  let grandTotalILS = 0;
  const grandEntityTotals: { [entity: string]: number } = {};
  
  CLASS_ORDER.forEach(({ class: className, subClasses }) => {
    // Skip Real Estate in the main loop - we'll handle it separately at the end
    if (className === 'Real Estate') return;
    
    let classTotalUSD = 0;
    let classTotalILS = 0;
    const classEntityTotalsUSD: { [entity: string]: number } = {};
    const classEntityTotalsILS: { [entity: string]: number } = {};
    
    // Add class header row
    rows.push([className, '', '', ...ENTITY_ORDER.map(() => ''), '', '', '']);
    
    // Special handling for Cash class - group by currency
    if (className === 'Cash') {
      const currencies = ['USD', 'ILS', 'EUR', 'CHF', 'CAD', 'HKD', 'GBP'];
      
      currencies.forEach(currency => {
        const cashAssets = assets.filter(a => 
          a.class === 'Cash' && 
          a.origin_currency === currency &&
          !['Private Equity', 'Real Estate'].includes(a.class)
        );
        
        if (cashAssets.length === 0) return;
        
        let currencyTotalUSD = 0;
        let currencyTotalILS = 0;
        let currencyTotalQty = 0;
        const currencyEntityQty: { [entity: string]: number } = {};
        const currencyEntityUSD: { [entity: string]: number } = {};
        const currencyEntityILS: { [entity: string]: number } = {};
        
        cashAssets.forEach(asset => {
          const entity = asset.account_entity;
          const calcUSD = calculateAssetValue(asset, fxRates, 'USD');
          const calcILS = calculateAssetValue(asset, fxRates, 'ILS');
          
          currencyEntityQty[entity] = (currencyEntityQty[entity] || 0) + asset.quantity;
          currencyEntityUSD[entity] = (currencyEntityUSD[entity] || 0) + calcUSD.converted_value;
          currencyEntityILS[entity] = (currencyEntityILS[entity] || 0) + calcILS.converted_value;
          
          currencyTotalQty += asset.quantity;
          currencyTotalUSD += calcUSD.converted_value;
          currencyTotalILS += calcILS.converted_value;
        });
        
        // Add currency row
        const row = [
          currency,
          currency,
          1, // Price is 1 for cash
          ...ENTITY_ORDER.map(entity => currencyEntityQty[entity] || 0),
          currencyTotalQty,
          currencyTotalUSD,
          currencyTotalILS
        ];
        rows.push(row);
        
        classTotalUSD += currencyTotalUSD;
        classTotalILS += currencyTotalILS;
        
        ENTITY_ORDER.forEach(entity => {
          if (currencyEntityUSD[entity]) {
            classEntityTotalsUSD[entity] = (classEntityTotalsUSD[entity] || 0) + currencyEntityUSD[entity];
            classEntityTotalsILS[entity] = (classEntityTotalsILS[entity] || 0) + currencyEntityILS[entity];
            grandEntityTotals[entity] = (grandEntityTotals[entity] || 0) + currencyEntityUSD[entity];
          }
        });
      });
      
      // Add Cash class total rows
      if (classTotalUSD > 0 || classTotalILS > 0) {
        rows.push([
          'Total Cash USD',
          '', '',
          ...ENTITY_ORDER.map(entity => classEntityTotalsUSD[entity] || 0),
          '',
          classTotalUSD,
          ''
        ]);
        
        rows.push([
          'Total Cash ILS',
          '', '',
          ...ENTITY_ORDER.map(entity => classEntityTotalsILS[entity] || 0),
          '',
          '',
          classTotalILS
        ]);
        
        grandTotalUSD += classTotalUSD;
        grandTotalILS += classTotalILS;
      }
      
      return; // Skip the normal subclass processing for Cash
    }
    
    subClasses.forEach(subClass => {
      const subClassGroups = groups.filter(g => g.class === className && g.subClass === subClass);
      
      if (subClassGroups.length === 0) return;
      
      // Add sub-class header row
      rows.push([subClass, '', '', ...ENTITY_ORDER.map(() => ''), '', '', '']);
      
      let subClassTotalUSD = 0;
      let subClassTotalILS = 0;
      const subClassEntityTotalsUSD: { [entity: string]: number } = {};
      const subClassEntityTotalsILS: { [entity: string]: number } = {};
      
      // Add asset rows for this sub-class
      subClassGroups.forEach(group => {
        const row = [
          group.name,
          group.currency,
          group.price,
          ...ENTITY_ORDER.map(entity => group.entityQuantities[entity] || 0),
          group.totalQuantity,
          group.totalUSD,
          group.totalILS
        ];
        rows.push(row);
        
        subClassTotalUSD += group.totalUSD;
        subClassTotalILS += group.totalILS;
        
        ENTITY_ORDER.forEach(entity => {
          if (group.entityQuantities[entity]) {
            const entityAssets = assets.filter(a => a.name === group.name && a.account_entity === entity);
            const entityUSD = entityAssets.reduce((sum, a) => sum + calculateAssetValue(a, fxRates, 'USD').converted_value, 0);
            const entityILS = entityAssets.reduce((sum, a) => sum + calculateAssetValue(a, fxRates, 'ILS').converted_value, 0);
            
            subClassEntityTotalsUSD[entity] = (subClassEntityTotalsUSD[entity] || 0) + entityUSD;
            subClassEntityTotalsILS[entity] = (subClassEntityTotalsILS[entity] || 0) + entityILS;
            classEntityTotalsUSD[entity] = (classEntityTotalsUSD[entity] || 0) + entityUSD;
            classEntityTotalsILS[entity] = (classEntityTotalsILS[entity] || 0) + entityILS;
            grandEntityTotals[entity] = (grandEntityTotals[entity] || 0) + entityUSD;
          }
        });
      });
      
      // Add sub-class total rows (USD then ILS)
      rows.push([
        `Total ${subClass} USD`,
        '', '',
        ...ENTITY_ORDER.map(entity => subClassEntityTotalsUSD[entity] || 0),
        '',
        subClassTotalUSD,
        ''
      ]);
      
      rows.push([
        `Total ${subClass} ILS`,
        '', '',
        ...ENTITY_ORDER.map(entity => subClassEntityTotalsILS[entity] || 0),
        '',
        '',
        subClassTotalILS
      ]);
      
      classTotalUSD += subClassTotalUSD;
      classTotalILS += subClassTotalILS;
    });
    
    // Add class total rows if there were any assets in this class
    if (classTotalUSD > 0 || classTotalILS > 0) {
      rows.push([
        `Total ${className} USD`,
        '', '',
        ...ENTITY_ORDER.map(entity => classEntityTotalsUSD[entity] || 0),
        '',
        classTotalUSD,
        ''
      ]);
      
      rows.push([
        `Total ${className} ILS`,
        '', '',
        ...ENTITY_ORDER.map(entity => classEntityTotalsILS[entity] || 0),
        '',
        '',
        classTotalILS
      ]);
      
      grandTotalUSD += classTotalUSD;
      grandTotalILS += classTotalILS;
    }
  });
  
  // Add grand total rows (excluding Real Estate)
  rows.push([
    'Grand Total USD (Excl. Real Estate)',
    '', '',
    ...ENTITY_ORDER.map(entity => grandEntityTotals[entity] || 0),
    '',
    grandTotalUSD,
    ''
  ]);
  
  // Calculate grand entity totals in ILS (excluding Real Estate)
  const grandEntityTotalsILS: { [entity: string]: number } = {};
  ENTITY_ORDER.forEach(entity => {
    const entityAssets = assets.filter(a => 
      a.account_entity === entity && 
      !['Private Equity', 'Real Estate'].includes(a.class)
    );
    grandEntityTotalsILS[entity] = entityAssets.reduce(
      (sum, a) => sum + calculateAssetValue(a, fxRates, 'ILS').converted_value, 
      0
    );
  });
  
  rows.push([
    'Grand Total ILS (Excl. Real Estate)',
    '', '',
    ...ENTITY_ORDER.map(entity => grandEntityTotalsILS[entity] || 0),
    '',
    '',
    grandTotalILS
  ]);
  
  // Now add Real Estate at the end
  const reClassOrder = CLASS_ORDER.find(c => c.class === 'Real Estate');
  if (reClassOrder) {
    const { class: className, subClasses } = reClassOrder;
    
    // Add Real Estate class header
    rows.push([className, '', '', ...ENTITY_ORDER.map(() => ''), '', '', '']);
    
    let classTotalUSD = 0;
    let classTotalILS = 0;
    const classEntityTotalsUSD: { [entity: string]: number } = {};
    const classEntityTotalsILS: { [entity: string]: number } = {};
    
    subClasses.forEach(subClass => {
      const subClassAssets = assets.filter(a => a.class === 'Real Estate' && a.sub_class === subClass);
      
      if (subClassAssets.length === 0) return;
      
      // Add sub-class header
      rows.push([subClass, '', '', ...ENTITY_ORDER.map(() => ''), '', '', '']);
      
      let subClassTotalUSD = 0;
      let subClassTotalILS = 0;
      const subClassEntityTotalsUSD: { [entity: string]: number } = {};
      const subClassEntityTotalsILS: { [entity: string]: number } = {};
      
      // Group Real Estate assets by name
      const assetGroups = new Map<string, Asset[]>();
      subClassAssets.forEach(asset => {
        if (!assetGroups.has(asset.name)) {
          assetGroups.set(asset.name, []);
        }
        assetGroups.get(asset.name)!.push(asset);
      });
      
      // Add row for each Real Estate asset group
      assetGroups.forEach((groupAssets, assetName) => {
        const firstAsset = groupAssets[0];
        let totalQty = 0;
        let totalUSD = 0;
        let totalILS = 0;
        const entityQty: { [entity: string]: number } = {};
        const entityUSD: { [entity: string]: number } = {};
        const entityILS: { [entity: string]: number } = {};
        
        groupAssets.forEach(asset => {
          const entity = asset.account_entity;
          const factor = asset.factor || 1;
          const calcUSD = calculateAssetValue(asset, fxRates, 'USD');
          const calcILS = calculateAssetValue(asset, fxRates, 'ILS');
          
          const factoredUSD = calcUSD.converted_value * factor;
          const factoredILS = calcILS.converted_value * factor;
          
          entityQty[entity] = (entityQty[entity] || 0) + asset.quantity;
          entityUSD[entity] = (entityUSD[entity] || 0) + factoredUSD;
          entityILS[entity] = (entityILS[entity] || 0) + factoredILS;
          
          totalQty += asset.quantity;
          totalUSD += factoredUSD;
          totalILS += factoredILS;
        });
        
        const row = [
          assetName,
          firstAsset.origin_currency,
          firstAsset.price,
          ...ENTITY_ORDER.map(entity => entityQty[entity] || 0),
          totalQty,
          totalUSD,
          totalILS
        ];
        rows.push(row);
        
        subClassTotalUSD += totalUSD;
        subClassTotalILS += totalILS;
        
        ENTITY_ORDER.forEach(entity => {
          if (entityUSD[entity]) {
            subClassEntityTotalsUSD[entity] = (subClassEntityTotalsUSD[entity] || 0) + entityUSD[entity];
            subClassEntityTotalsILS[entity] = (subClassEntityTotalsILS[entity] || 0) + entityILS[entity];
          }
        });
      });
      
      // Add sub-class total rows
      rows.push([
        `Total ${subClass} USD`,
        '', '',
        ...ENTITY_ORDER.map(entity => subClassEntityTotalsUSD[entity] || 0),
        '',
        subClassTotalUSD,
        ''
      ]);
      
      rows.push([
        `Total ${subClass} ILS`,
        '', '',
        ...ENTITY_ORDER.map(entity => subClassEntityTotalsILS[entity] || 0),
        '',
        '',
        subClassTotalILS
      ]);
      
      classTotalUSD += subClassTotalUSD;
      classTotalILS += subClassTotalILS;
      
      ENTITY_ORDER.forEach(entity => {
        classEntityTotalsUSD[entity] = (classEntityTotalsUSD[entity] || 0) + (subClassEntityTotalsUSD[entity] || 0);
        classEntityTotalsILS[entity] = (classEntityTotalsILS[entity] || 0) + (subClassEntityTotalsILS[entity] || 0);
      });
    });
    
    // Add Real Estate class total rows
    if (classTotalUSD > 0 || classTotalILS > 0) {
      rows.push([
        'Total Real Estate USD',
        '', '',
        ...ENTITY_ORDER.map(entity => classEntityTotalsUSD[entity] || 0),
        '',
        classTotalUSD,
        ''
      ]);
      
      rows.push([
        'Total Real Estate ILS',
        '', '',
        ...ENTITY_ORDER.map(entity => classEntityTotalsILS[entity] || 0),
        '',
        '',
        classTotalILS
      ]);
      
      // Add final grand total including Real Estate
      const finalGrandTotalUSD = grandTotalUSD + classTotalUSD;
      const finalGrandTotalILS = grandTotalILS + classTotalILS;
      const finalGrandEntityTotalsUSD: { [entity: string]: number } = {};
      const finalGrandEntityTotalsILS: { [entity: string]: number } = {};
      
      ENTITY_ORDER.forEach(entity => {
        finalGrandEntityTotalsUSD[entity] = (grandEntityTotals[entity] || 0) + (classEntityTotalsUSD[entity] || 0);
        finalGrandEntityTotalsILS[entity] = (grandEntityTotalsILS[entity] || 0) + (classEntityTotalsILS[entity] || 0);
      });
      
      rows.push([
        'Grand Total USD (Incl. Real Estate)',
        '', '',
        ...ENTITY_ORDER.map(entity => finalGrandEntityTotalsUSD[entity] || 0),
        '',
        finalGrandTotalUSD,
        ''
      ]);
      
      rows.push([
        'Grand Total ILS (Incl. Real Estate)',
        '', '',
        ...ENTITY_ORDER.map(entity => finalGrandEntityTotalsILS[entity] || 0),
        '',
        '',
        finalGrandTotalILS
      ]);
    }
  }
  
  return rows;
}

// Build PE summary with subclasses
export function buildPESummaryData(assets: Asset[], fxRates: FXRates, liquidationSettings: { asset_name: string; liquidation_year: string }[]): any[] {
  const peAssets = assets.filter(a => a.class === 'Private Equity');
  
  if (peAssets.length === 0) {
    return [['No Private Equity holdings']];
  }
  
  const rows: any[] = [];
  
  // Header row
  const headers = ['Company', 'Holding Valuation (Price)', 'Factor', 'Liquidation Year', 'Total USD (Factored)'];
  rows.push(headers);
  
  // Define subclass order
  const subClasses = ['Near Future', 'Growth', 'Initial'];
  
  let grandTotalUSD = 0;
  
  // Process each subclass
  subClasses.forEach(subClass => {
    const subClassAssets = peAssets.filter(a => a.sub_class === subClass);
    
    if (subClassAssets.length === 0) return;
    
    // Add sub-class header
    rows.push([subClass, '', '', '', '']);
    
    let subClassTotalUSD = 0;
    
    // Group assets by name (company)
    const assetGroups = new Map<string, Asset[]>();
    subClassAssets.forEach(asset => {
      if (!assetGroups.has(asset.name)) {
        assetGroups.set(asset.name, []);
      }
      assetGroups.get(asset.name)!.push(asset);
    });
    
    // Calculate totals for sorting
    const groupsWithTotals = Array.from(assetGroups.entries()).map(([companyName, groupAssets]) => {
      const firstAsset = groupAssets[0];
      const liquidationYear = liquidationSettings.find(s => s.asset_name === companyName)?.liquidation_year || '';
      const factor = firstAsset.factor || 1;
      
      let totalFactoredUSD = 0;
      
      groupAssets.forEach(asset => {
        const calcUSD = calculateAssetValue(asset, fxRates, 'USD');
        totalFactoredUSD += calcUSD.converted_value * (asset.factor || 1);
      });
      
      return {
        companyName,
        firstAsset,
        liquidationYear,
        factor,
        totalFactoredUSD
      };
    });
    
    // Sort by factored USD value (largest to smallest)
    groupsWithTotals.sort((a, b) => b.totalFactoredUSD - a.totalFactoredUSD);
    
    // Add row for each company
    groupsWithTotals.forEach(({ companyName, firstAsset, liquidationYear, factor, totalFactoredUSD }) => {
      const row = [
        companyName,
        firstAsset.price,
        factor,
        liquidationYear,
        totalFactoredUSD
      ];
      rows.push(row);
      
      subClassTotalUSD += totalFactoredUSD;
    });
    
    // Add sub-class total
    rows.push([
      `Total ${subClass}`,
      '',
      '',
      '',
      subClassTotalUSD
    ]);
    
    grandTotalUSD += subClassTotalUSD;
  });
  
  // Add grand total
  rows.push([
    'Grand Total Private Equity',
    '',
    '',
    '',
    grandTotalUSD
  ]);
  
  return rows;
}

// Build chart data tables
export function buildChartDataSheets(assets: Asset[], fxRates: FXRates): { [sheetName: string]: any[] } {
  const sheets: { [sheetName: string]: any[] } = {};
  
  // Helper to calculate totals by class
  const getClassTotals = () => {
    const totals: { [className: string]: { usd: number, ils: number } } = {};
    let grandTotal = 0;
    
    assets.forEach(asset => {
      const className = asset.class;
      if (!totals[className]) {
        totals[className] = { usd: 0, ils: 0 };
      }
      
      const calcUSD = calculateAssetValue(asset, fxRates, 'USD');
      const calcILS = calculateAssetValue(asset, fxRates, 'ILS');
      
      totals[className].usd += calcUSD.converted_value;
      totals[className].ils += calcILS.converted_value;
      grandTotal += calcUSD.converted_value;
    });
    
    return { totals, grandTotal };
  };
  
  // 1. Asset Class Distribution
  const { totals: classTotals, grandTotal } = getClassTotals();
  sheets['Asset Class Distribution'] = [
    ['Asset Class', 'Value (USD)', 'Value (ILS)', 'Percentage'],
    ...Object.entries(classTotals).map(([className, values]) => [
      className,
      values.usd,
      values.ils,
      (values.usd / grandTotal * 100).toFixed(2) + '%'
    ])
  ];
  
  // 2. Beneficiaries Breakdown
  const beneficiaryTotals: { [beneficiary: string]: { usd: number, ils: number } } = {};
  assets.forEach(asset => {
    const beneficiary = asset.beneficiary;
    if (!beneficiaryTotals[beneficiary]) {
      beneficiaryTotals[beneficiary] = { usd: 0, ils: 0 };
    }
    
    const calcUSD = calculateAssetValue(asset, fxRates, 'USD');
    const calcILS = calculateAssetValue(asset, fxRates, 'ILS');
    
    beneficiaryTotals[beneficiary].usd += calcUSD.converted_value;
    beneficiaryTotals[beneficiary].ils += calcILS.converted_value;
  });
  
  sheets['Beneficiaries Breakdown'] = [
    ['Beneficiary', 'Value (USD)', 'Value (ILS)', 'Percentage'],
    ...Object.entries(beneficiaryTotals).map(([beneficiary, values]) => [
      beneficiary,
      values.usd,
      values.ils,
      (values.usd / grandTotal * 100).toFixed(2) + '%'
    ])
  ];
  
  // 3. Currency Exposure
  const currencyTotals: { [currency: string]: { usd: number, ils: number } } = {};
  assets.forEach(asset => {
    const currency = asset.origin_currency;
    if (!currencyTotals[currency]) {
      currencyTotals[currency] = { usd: 0, ils: 0 };
    }
    
    const calcUSD = calculateAssetValue(asset, fxRates, 'USD');
    const calcILS = calculateAssetValue(asset, fxRates, 'ILS');
    
    currencyTotals[currency].usd += calcUSD.converted_value;
    currencyTotals[currency].ils += calcILS.converted_value;
  });
  
  sheets['Currency Exposure'] = [
    ['Currency', 'Value (USD)', 'Value (ILS)', 'Percentage'],
    ...Object.entries(currencyTotals).map(([currency, values]) => [
      currency,
      values.usd,
      values.ils,
      (values.usd / grandTotal * 100).toFixed(2) + '%'
    ])
  ];
  
  // 4. Fixed Income Sub-Classes
  const fixedIncomeAssets = assets.filter(a => a.class === 'Fixed Income');
  const fixedIncomeTotal = fixedIncomeAssets.reduce((sum, a) => 
    sum + calculateAssetValue(a, fxRates, 'USD').converted_value, 0
  );
  
  const fixedIncomeSubClasses: { [subClass: string]: { usd: number, ils: number } } = {};
  fixedIncomeAssets.forEach(asset => {
    const subClass = asset.sub_class;
    if (!fixedIncomeSubClasses[subClass]) {
      fixedIncomeSubClasses[subClass] = { usd: 0, ils: 0 };
    }
    
    const calcUSD = calculateAssetValue(asset, fxRates, 'USD');
    const calcILS = calculateAssetValue(asset, fxRates, 'ILS');
    
    fixedIncomeSubClasses[subClass].usd += calcUSD.converted_value;
    fixedIncomeSubClasses[subClass].ils += calcILS.converted_value;
  });
  
  sheets['Fixed Income Sub-Classes'] = [
    ['Sub-Class', 'Value (USD)', 'Value (ILS)', 'Percentage'],
    ...Object.entries(fixedIncomeSubClasses).map(([subClass, values]) => [
      subClass,
      values.usd,
      values.ils,
      (values.usd / fixedIncomeTotal * 100).toFixed(2) + '%'
    ])
  ];
  
  // 5. Public Equity Sub-Classes
  const publicEquityAssets = assets.filter(a => a.class === 'Public Equity');
  const publicEquityTotal = publicEquityAssets.reduce((sum, a) => 
    sum + calculateAssetValue(a, fxRates, 'USD').converted_value, 0
  );
  
  const publicEquitySubClasses: { [subClass: string]: { usd: number, ils: number } } = {};
  publicEquityAssets.forEach(asset => {
    const subClass = asset.sub_class;
    if (!publicEquitySubClasses[subClass]) {
      publicEquitySubClasses[subClass] = { usd: 0, ils: 0 };
    }
    
    const calcUSD = calculateAssetValue(asset, fxRates, 'USD');
    const calcILS = calculateAssetValue(asset, fxRates, 'ILS');
    
    publicEquitySubClasses[subClass].usd += calcUSD.converted_value;
    publicEquitySubClasses[subClass].ils += calcILS.converted_value;
  });
  
  sheets['Public Equity Sub-Classes'] = [
    ['Sub-Class', 'Value (USD)', 'Value (ILS)', 'Percentage'],
    ...Object.entries(publicEquitySubClasses).map(([subClass, values]) => [
      subClass,
      values.usd,
      values.ils,
      (values.usd / publicEquityTotal * 100).toFixed(2) + '%'
    ])
  ];
  
  // 6. Top 10 Public Equity Holdings
  const publicEquityHoldings: { [name: string]: number } = {};
  publicEquityAssets.forEach(asset => {
    const name = asset.name;
    publicEquityHoldings[name] = (publicEquityHoldings[name] || 0) + 
      calculateAssetValue(asset, fxRates, 'USD').converted_value;
  });
  
  const topPublicEquity = Object.entries(publicEquityHoldings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sheets['Top 10 Public Equity'] = [
    ['Asset Name', 'Value (USD)', 'Value (ILS)', '% of Public Equity'],
    ...topPublicEquity.map(([name, valueUSD]) => {
      const assetILS = publicEquityAssets
        .filter(a => a.name === name)
        .reduce((sum, a) => sum + calculateAssetValue(a, fxRates, 'ILS').converted_value, 0);
      
      return [
        name,
        valueUSD,
        assetILS,
        (valueUSD / publicEquityTotal * 100).toFixed(2) + '%'
      ];
    })
  ];
  
  // 7. Top 10 Private Equity Holdings
  const privateEquityAssets = assets.filter(a => a.class === 'Private Equity');
  const privateEquityTotal = privateEquityAssets.reduce((sum, a) => 
    sum + calculateAssetValue(a, fxRates, 'USD').converted_value, 0
  );
  
  const privateEquityHoldings: { [name: string]: number } = {};
  privateEquityAssets.forEach(asset => {
    const name = asset.name;
    privateEquityHoldings[name] = (privateEquityHoldings[name] || 0) + 
      calculateAssetValue(asset, fxRates, 'USD').converted_value;
  });
  
  const topPrivateEquity = Object.entries(privateEquityHoldings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sheets['Top 10 Private Equity'] = [
    ['Asset Name', 'Value (USD)', 'Value (ILS)', '% of Private Equity'],
    ...topPrivateEquity.map(([name, valueUSD]) => {
      const assetILS = privateEquityAssets
        .filter(a => a.name === name)
        .reduce((sum, a) => sum + calculateAssetValue(a, fxRates, 'ILS').converted_value, 0);
      
      return [
        name,
        valueUSD,
        assetILS,
        privateEquityTotal > 0 ? (valueUSD / privateEquityTotal * 100).toFixed(2) + '%' : '0%'
      ];
    })
  ];
  
  return sheets;
}

// Apply styling to a data sheet with header rows support
export function applySheetStyling(
  sheet: XLSX.WorkSheet, 
  rowCount: number, 
  isTotalRow: (row: number) => boolean, 
  isSubtotalRow: (row: number) => boolean,
  isHeaderRow?: (row: number) => boolean
) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  // Style headers
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (sheet[headerAddr]) {
      sheet[headerAddr].s = HEADER_STYLE;
    }
  }
  
  // Style data rows
  for (let R = 1; R <= range.e.r; ++R) {
    const isTotal = isTotalRow(R);
    const isSubtotal = isSubtotalRow(R);
    const isHeader = isHeaderRow ? isHeaderRow(R) : false;
    const isAlternate = R % 2 === 0;
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      if (sheet[cellAddr]) {
        let style: any = isAlternate ? ALTERNATE_ROW_STYLE : DATA_STYLE;
        
        if (isTotal) {
          style = TOTAL_ROW_STYLE;
        } else if (isSubtotal) {
          style = SUBTOTAL_ROW_STYLE;
        } else if (isHeader) {
          // Header row style (merged cell with class/subclass name)
          style = {
            ...DATA_STYLE,
            font: { name: 'Arial', sz: 11, bold: true },
            fill: { fgColor: { rgb: 'E7E6E6' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
        
        // Apply number formatting for numeric columns
        if (sheet[cellAddr].t === 'n') {
          style = { ...style, numFmt: '#,##0.00' };
        }
        
        sheet[cellAddr].s = style;
      }
    }
  }
}
