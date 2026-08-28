import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import '@patternfly/react-core/dist/styles/base.css';
import {App} from '@compass/App';
import {ThemeProvider} from '@compass/theme/ThemeContext';
import "./main.css"

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <App/>
            </BrowserRouter>
        </ThemeProvider>
    </React.StrictMode>
);
