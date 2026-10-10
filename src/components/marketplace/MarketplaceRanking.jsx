import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Trophy, TrendingUp, ShoppingBag, Loader2, Crown } from 'lucide-react';

export default function MarketplaceRanking() {
  const [sellers, setSellers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const [sellerAgg, buyerAgg] = await Promise.all([
        base44.entities.PointsTransaction.aggregate({
          query: { type: 'marketplace_sold' },
          groupBy: 'user_email',
          sum: 'points',
          sort: '-sum_points',
          limit: 5
        }),
        base44.entities.PointsTransaction.aggregate({
          query: { type: 'marketplace_bought' },
          groupBy: 'user_email',
          sum: 'points',
          sort: '-sum_points',
          limit: 5
        })
      ]);

      // Busca nomes para os top users
      const sellerRows = sellerAgg?.rows || [];
      const buyerRows = buyerAgg?.rows || [];

      const allEmails = [...new Set([...sellerRows.map(r => r.user_email), ...buyerRows.map(r => r.user_email)])];
      const nameMap = {};
      if (allEmails.length > 0) {
        // Busca uma transação por email para obter o user_name
        for (const email of allEmails) {
          try {
            const txs = await base44.entities.PointsTransaction.filter(
              { user_email: email, type: { $in: ['marketplace_sold', 'marketplace_bought'] } },
              '-created_date', 1
            );
            if (txs.length > 0) nameMap[email] = txs[0].user_name || email;
          } catch (e) { nameMap[email] = email; }
        }
      }

      setSellers(sellerRows.map(r => ({
        email: r.user_email,
        name: nameMap[r.user_email] || r.user_email,
        pointsSold: Math.abs(Number(r.sum_points) || 0),
        salesCount: Number(r.count) || 0
      })));

      setBuyers(buyerRows.map(r => ({
        email: r.user_email,
        name: nameMap[r.user_email] || r.user_email,
        pointsBought: Math.abs(Number(r.sum_points) || 0),
        purchasesCount: Number(r.count) || 0
      })));
    } catch (err) {
      console.error('Erro ao carregar ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  if (sellers.length === 0 && buyers.length === 0) {
    return (
      <div className="text-center py-8 bg-card border border-border rounded-2xl">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma venda concluída no marketplace ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Os melhores vendedores e compradores aparecerão aqui</p>
      </div>
    );
  }

  const renderRank = (list, type) => list.map((item, idx) => {
    const isTop = idx === 0;
    return (
      <motion.div
        key={item.email}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          isTop ? 'bg-gold/10 border border-gold/30' : 'bg-secondary/30 border border-border'
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
          isTop ? 'bg-gold/20 text-gold' : idx === 1 ? 'bg-gray-400/15 text-gray-300' : idx === 2 ? 'bg-orange-700/20 text-orange-500' : 'bg-secondary text-muted-foreground'
        }`}>
          {isTop ? <Crown className="w-4 h-4" /> : idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {type === 'seller' ? `${item.salesCount} venda${item.salesCount !== 1 ? 's' : ''}` : `${item.purchasesCount} compra${item.purchasesCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-coin">
            {(type === 'seller' ? item.pointsSold : item.pointsBought).toLocaleString('pt-BR')}
          </p>
          <p className="text-[10px] text-muted-foreground">pts</p>
        </div>
      </motion.div>
    );
  });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Top Vendedores */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gold/15 rounded-lg">
            <TrendingUp className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Melhores Vendedores</h3>
            <p className="text-xs text-muted-foreground">Pontos vendidos no marketplace</p>
          </div>
        </div>
        <div className="space-y-2">
          {sellers.length > 0 ? renderRank(sellers, 'seller') : (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma venda concluída</p>
          )}
        </div>
      </div>

      {/* Top Compradores */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple/15 rounded-lg">
            <ShoppingBag className="w-5 h-5 text-purple" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Melhores Compradores</h3>
            <p className="text-xs text-muted-foreground">Pontos comprados no marketplace</p>
          </div>
        </div>
        <div className="space-y-2">
          {buyers.length > 0 ? renderRank(buyers, 'buyer') : (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma compra concluída</p>
          )}
        </div>
      </div>
    </div>
  );
}