import {useEffect} from 'react';
import {useCveStore} from '@stores/useCveStore';
import AppCompass from './AppCompass';
import './App.css';

export function App() {

    const fetchAll = useCveStore((s) => s.fetchAll);

    useEffect(() => {
        fetchAll();
    }, []);

    return <AppCompass/>;
}
