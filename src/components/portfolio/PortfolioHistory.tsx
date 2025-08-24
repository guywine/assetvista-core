import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Calendar, Trash2 } from 'lucide-react';
import { PortfolioSnapshot } from '@/types/portfolio';
import { formatCurrency } from '@/lib/portfolio-utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export function PortfolioHistory() {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSnapshots((data || []).map(row => ({
        ...row,
        assets: row.assets as any[],
        fx_rates: row.fx_rates as any
      })));
    } catch (error) {
      console.error('Error loading snapshots:', error);
      toast({
        title: "Error",
        description: "Failed to load portfolio history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const deleteSnapshot = async (snapshot: PortfolioSnapshot) => {
    try {
      const { error } = await supabase
        .from('portfolio_snapshots')
        .delete()
        .eq('id', snapshot.id);

      if (error) throw error;

      setSnapshots(prev => prev.filter(s => s.id !== snapshot.id));
      
      toast({
        title: "Deleted",
        description: `Portfolio snapshot "${snapshot.name}" has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      toast({
        title: "Error",
        description: "Failed to delete portfolio snapshot",
        variant: "destructive",
      });
    }
  };

  const downloadSnapshot = (snapshot: PortfolioSnapshot) => {
    const workbook = XLSX.utils.book_new();

    // Assets sheet
    const assetsData = snapshot.assets.map(asset => ({
      Name: asset.name,
      Class: asset.class,
      'Sub Class': asset.sub_class,
      ISIN: asset.ISIN || '',
      'Account Entity': asset.account_entity,
      'Account Bank': asset.account_bank,
      Quantity: asset.quantity,
      Price: asset.price,
      Factor: asset.factor || '',
      'Origin Currency': asset.origin_currency,
      'Maturity Date': asset.maturity_date ? format(new Date(asset.maturity_date), 'yyyy-MM-dd') : '',
      YTW: asset.ytw || ''
    }));

    const assetsSheet = XLSX.utils.json_to_sheet(assetsData);
    XLSX.utils.book_append_sheet(workbook, assetsSheet, 'Assets');

    // FX Rates sheet
    const fxData = Object.entries(snapshot.fx_rates).map(([currency, rates]) => ({
      Currency: currency,
      'To USD': (rates as any).to_USD,
      'To ILS': (rates as any).to_ILS,
      'Last Updated': (rates as any).last_updated
    }));

    const fxSheet = XLSX.utils.json_to_sheet(fxData);
    XLSX.utils.book_append_sheet(workbook, fxSheet, 'FX Rates');

    // Summary sheet
    const summaryData = [
      { Metric: 'Total Value (USD)', Value: snapshot.total_value_usd },
      { Metric: 'Private Equity (USD)', Value: snapshot.private_equity_value_usd },
      { Metric: 'Public Equity (USD)', Value: snapshot.public_equity_value_usd },
      { Metric: 'Fixed Income (USD)', Value: snapshot.fixed_income_value_usd },
      { Metric: 'Snapshot Date', Value: snapshot.snapshot_date },
      { Metric: 'Description', Value: snapshot.description || '' }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Download
    const fileName = `${snapshot.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Downloaded",
      description: `Portfolio snapshot exported as ${fileName}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-muted-foreground">Loading portfolio history...</div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Portfolio History</h3>
        <p className="text-muted-foreground mb-4">
          Save your first portfolio snapshot to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Portfolio History</h3>
        <Badge variant="secondary">{snapshots.length} snapshots</Badge>
      </div>

      <div className="grid gap-4">
        {snapshots.map((snapshot) => (
          <Card key={snapshot.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{snapshot.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(snapshot.created_at), 'PPP')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Portfolio Snapshot</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{snapshot.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSnapshot(snapshot)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSnapshot(snapshot)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
              {snapshot.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {snapshot.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Private Equity</div>
                  <div className="font-semibold">
                    {formatCurrency(snapshot.private_equity_value_usd, 'USD')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Public Equity</div>
                  <div className="font-semibold">
                    {formatCurrency(snapshot.public_equity_value_usd, 'USD')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Fixed Income</div>
                  <div className="font-semibold">
                    {formatCurrency(snapshot.fixed_income_value_usd, 'USD')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="font-semibold text-lg">
                    {formatCurrency(snapshot.total_value_usd, 'USD')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}