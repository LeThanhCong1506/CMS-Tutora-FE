import './PageLoader.css';

const PageLoader = () => {
    return (
        <div className="page-loader">
            <div className="page-loader__spinner">
                <div className="page-loader__ring"></div>
                <div className="page-loader__ring"></div>
                <div className="page-loader__ring"></div>
            </div>
        </div>
    );
};

export default PageLoader;
