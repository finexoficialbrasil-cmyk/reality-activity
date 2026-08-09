import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

let _cache = null;
let _promise = null;

function fetchCategories() {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = base44.entities.Category.list('order', 200).then(cats => {
    _cache = cats;
    _promise = null;
    return cats;
  }).catch(() => {
    _promise = null;
    return [];
  });
  return _promise;
}

export function useCategories() {
  const [categories, setCategories] = useState(_cache || []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) return;
    let mounted = true;
    fetchCategories().then(cats => {
      if (mounted) {
        setCategories(cats);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const activeCategories = categories.filter(c => c.is_active);

  const getCategoryLabel = (value) => {
    const cat = categories.find(c => c.value === value);
    return cat ? `${cat.icon || ''} ${cat.label}`.trim() : value;
  };

  const reload = () => {
    _cache = null;
    return fetchCategories().then(cats => setCategories(cats));
  };

  return { categories, activeCategories, getCategoryLabel, loading, reload };
}