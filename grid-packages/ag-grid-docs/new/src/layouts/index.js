import React from "react";
import { Link } from 'gatsby';
import { GlobalContextProvider } from '../components/GlobalContext';
import FrameworkSelector from '../components/FrameworkSelector';
import Menu from '../components/Menu';
import './index.scss';
import 'typeface-roboto';

export default ({ path, children, pageContext: { framework } }) => {
    return <GlobalContextProvider>
        <div className="main_container">
            <div className="header">
                <Link to="/" className="header__logo" />
                <FrameworkSelector path={path} currentFramework={framework} />
            </div>
            <div className="content_viewport">
                {framework && <div className="main_menu">
                    <Menu currentFramework={framework} />
                </div>}
                <div className="content">
                    {children}
                </div>
            </div>
            <div className="footer">
                &copy; AG-Grid Ltd 2020
            </div>
        </div>
    </GlobalContextProvider>;
};
