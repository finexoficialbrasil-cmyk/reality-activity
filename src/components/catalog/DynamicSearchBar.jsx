import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Sparkles, TrendingUp, Package } from 'lucide-react';

export default function DynamicSearchBar({ 
  products, 
  companies, 
  onSearchChange, 
  onCategoryChange,
  searchValue,
  selectedCategory 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const searchRef = useRef(null);

  // Get unique categories from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  // Generate suggestions based on search
  useEffect(() => {
    if (searchValue.length < 1) {
      setSuggestions([]);
      return;
    }

    const query = searchValue.toLowerCase();
    
    // Search in products
    const productMatches = products
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 3)
      .map(p => ({
        type: 'product',
        id: p.id,
        label: p.name,
        company_id: p.company_id
      }));

    // Search in companies
    const companyMatches = companies
      .filter(c => c.name.toLowerCase().includes(query))
      .slice(0, 2)
      .map(c => ({
        type: 'company',
        id: c.id,
        label: c.name
      }));

    setSuggestions([...productMatches, ...companyMatches]);
  }, [searchValue, products, companies]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'company') {
      onCategoryChange(suggestion.id);
    } else {
      onSearchChange(suggestion.label);
    }
    setIsOpen(false);
  };

  const topProducts = products
    .sort((a, b) => b.redemptions_count - a.redemptions_count)
    .slice(0, 3);

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold pointer-events-none" />
        <input
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar produtos, empresas..."
          className="w-full bg-card border border-border rounded-full pl-12 pr-10 py-3 text-sm font-medium focus:outline-none focus:border-gold/70 focus:ring-2 focus:ring-gold/20 transition-all"
        />
        {searchValue && (
          <button
            onClick={() => {
              onSearchChange('');
              setSuggestions([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-3 left-0 right-0 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="max-h-96 overflow-y-auto">
              {/* Suggestions */}
              {searchValue.length > 0 && suggestions.length > 0 && (
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">Resultados</p>
                  {suggestions.map((suggestion, i) => (
                    <motion.button
                      key={`${suggestion.type}-${suggestion.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3 mb-1"
                    >
                      <Package className="w-4 h-4 text-gold flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {suggestion.label}
                        </p>
                        {suggestion.type === 'product' && (
                          <p className="text-xs text-muted-foreground">
                            {companies.find(c => c.id === suggestion.company_id)?.name}
                          </p>
                        )}
                      </div>
                      {suggestion.type === 'company' && (
                        <span className="text-xs text-gold font-semibold">Empresa</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Categories */}
              <div className="p-3 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">Categorias</p>
                <div className="flex flex-wrap gap-2 px-3 py-2">
                  <button
                    onClick={() => {
                      onCategoryChange('all');
                      setIsOpen(false);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-gold text-background'
                        : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-border'
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        onCategoryChange(cat);
                        setIsOpen(false);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedCategory === cat
                          ? 'bg-gold text-background'
                          : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-border'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Products */}
              {searchValue.length === 0 && (
                <div className="p-3">
                  <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-gold" />
                    Mais Populares
                  </p>
                  {topProducts.map((product, i) => (
                    <motion.button
                      key={product.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        onSearchChange(product.name);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-3 mb-1"
                    >
                      <Sparkles className="w-4 h-4 text-purple flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {companies.find(c => c.id === product.company_id)?.name}
                        </p>
                      </div>
                      <span className="text-xs text-gold font-bold whitespace-nowrap">
                        {product.points_cost.toLocaleString()} pts
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {searchValue.length > 0 && suggestions.length === 0 && (
                <div className="p-8 text-center">
                  <Package className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">Nenhum resultado para "{searchValue}"</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}