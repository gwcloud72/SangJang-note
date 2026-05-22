import { useEffect, useState } from 'react';
import Dashboard from './components/dashboard.jsx';
import SangjangShowcase from './showcase/ShowcasePage.jsx';

function getIsShowcase() {
  if (typeof window === 'undefined') return false;
  return window.location.hash.replace(/^#\/?/, '').startsWith('showcase');
}

export default function App() {
  const [isShowcase, setIsShowcase] = useState(getIsShowcase);

  useEffect(() => {
    const updateRoute = () => setIsShowcase(getIsShowcase());
    window.addEventListener('hashchange', updateRoute);
    updateRoute();
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  return isShowcase ? <SangjangShowcase /> : <Dashboard />;
}
