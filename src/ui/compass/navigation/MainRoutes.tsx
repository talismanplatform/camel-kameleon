import {lazy, Suspense} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';
import {ROUTES} from './Routes';
import {PageFallback} from './PageFallback';
import {NotFoundPage} from './NotFoundPage';

// Pages are lazily loaded so each one becomes its own chunk and keeps its
// dependencies (tables, charts) out of the shell entry bundle.
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage').then(m => ({default: m.default})));
const CvesPage = lazy(() => import('@pages/cves/CvesPage').then(m => ({default: m.CvesPage})));
const ComponentsPage = lazy(() => import('@pages/components/ComponentsPage').then(m => ({default: m.ComponentsPage})));
const VersionsPage = lazy(() => import('@pages/versions/VersionsPage').then(m => ({default: m.VersionsPage})));
const AboutPage = lazy(() => import('@pages/about/AboutPage').then(m => ({default: m.AboutPage})));

export function MainRoutes() {
    return (
        <Suspense fallback={<PageFallback/>}>
            <Routes>
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage/>}/>
                <Route path={ROUTES.CVES} element={<CvesPage/>}/>
                <Route path={ROUTES.CVE_DETAIL} element={<CvesPage/>}/>
                <Route path={ROUTES.COMPONENTS} element={<ComponentsPage/>}/>
                <Route path={ROUTES.VERSIONS} element={<VersionsPage/>}/>
                <Route path={ROUTES.ABOUT} element={<AboutPage/>}/>
                <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace/>}/>
                <Route path="*" element={<NotFoundPage/>}/>
            </Routes>
        </Suspense>
    );
}
