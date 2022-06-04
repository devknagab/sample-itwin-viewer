import "./App.scss";

import { Viewer } from "@bentley/itwin-viewer-react";
import React, { useEffect, useState } from "react";

import AuthorizationClient from "./AuthorizationClient";
import { Header } from "./Header";
import {
  IModelApp,
  IModelConnection,
  ScreenViewport,
} from "@bentley/imodeljs-frontend";

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(
    AuthorizationClient.oidcClient
      ? AuthorizationClient.oidcClient.isAuthorized
      : false
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const initOidc = async () => {
      if (!AuthorizationClient.oidcClient) {
        await AuthorizationClient.initializeOidc();
      }

      try {
        // attempt silent signin
        await AuthorizationClient.signInSilent();
        setIsAuthorized(AuthorizationClient.oidcClient.isAuthorized);
      } catch (error) {
        // swallow the error. User can click the button to sign in
      }
    };
    initOidc().catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (!process.env.IMJS_CONTEXT_ID) {
      throw new Error(
        "Please add a valid context ID in the .env file and restart the application"
      );
    }
    if (!process.env.IMJS_IMODEL_ID) {
      throw new Error(
        "Please add a valid iModel ID in the .env file and restart the application"
      );
    }
  }, []);

  useEffect(() => {
    if (isLoggingIn && isAuthorized) {
      setIsLoggingIn(false);
    }
  }, [isAuthorized, isLoggingIn]);

  const onLoginClick = async () => {
    setIsLoggingIn(true);
    await AuthorizationClient.signIn();
  };

  const onLogoutClick = async () => {
    setIsLoggingIn(false);
    await AuthorizationClient.signOut();
    setIsAuthorized(false);
  };

  const onIModelConnected = (_imodel: IModelConnection) => {
    console.log("Hello");
    IModelApp.viewManager.onViewOpen.addOnce(async (vp: ScreenViewport) => {
      const categoriesToHide: string[] = [
        "'Dry Wall 1st'",
        "'Wall 1st'",
        "'Dry Wall 2nd'",
        "'Brick Exterior'",
        "'WINDOWS 2ND'",
        "'Ceiling 1st'",
        "'Wall 2nd'",
        "'Roof'",
        "'Callouts'",
        "'light fixture'",
      ];

      const query = `SELECT ECInstanceId FROM Bis. Category WHERE CodeValue IN (${categoriesToHide.toString()})`;
      const result = _imodel.query(query); // async iterator
      const categoryIds = [];
      for await (const row of result) {
        categoryIds.push(row.id);
      }
      console.log(categoryIds);
      vp.changeCategoryDisplay(categoryIds, false);

    });
  };

  return (
    <div className="viewer-container">
      <Header
        handleLogin={onLoginClick}
        loggedIn={isAuthorized}
        handleLogout={onLogoutClick}
      />
      {isLoggingIn ? (
        <span>"Logging in...."</span>
      ) : (
        isAuthorized && (
          <Viewer
            contextId={process.env.IMJS_CONTEXT_ID ?? ""}
            iModelId={process.env.IMJS_IMODEL_ID ?? ""}
            authConfig={{ oidcClient: AuthorizationClient.oidcClient }}
            onIModelConnected={onIModelConnected}
          />
        )
      )}
    </div>
  );
};

export default App;
