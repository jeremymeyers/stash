import React from "react";
import { Route, Switch } from "react-router-dom";
import { PersistanceLevel } from "src/hooks/ListHook";
import { Gallery } from "./GalleryDetails/Gallery";
import { GalleryList } from "./GalleryList";

const Galleries = () => (
  <Switch>
    <Route
      exact
      path="/galleries"
      render={(props) => (
        <GalleryList {...props} persistState={PersistanceLevel.ALL} />
      )}
    />
    <Route path="/galleries/:id/:tab?" component={Gallery} />
  </Switch>
);

export default Galleries;
