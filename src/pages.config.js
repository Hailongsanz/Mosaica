import Home from './pages/Home';
import Landing from './pages/Landing';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Landing": Landing,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};