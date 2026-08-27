import React from 'react';
import {Brand} from "@patternfly/react-core/dist/esm/components/Brand";
import logo from '@shared/icons/camel-logo.svg';
import "./AppLogo.css"
import {Content} from "@patternfly/react-core/dist/esm/components/Content";

export const AppLogo: React.FunctionComponent = () => {

    return (
        <div className={'brand-logo'}>
            <Brand src={logo} alt="Apache Camel" heights={{default: '32px'}} widths={{default: '32px'}}/>
            <Content component={"h6"}>Apache Camel Kameleon 0.1.0</Content>
        </div>
    );
};
