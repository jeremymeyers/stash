import React, { useState } from "react";
import _ from "lodash";
import { useHistory } from "react-router-dom";
import Mousetrap from "mousetrap";
import {
  FindScenesQueryResult,
  SlimSceneDataFragment,
} from "src/core/generated-graphql";
import { queryFindScenes } from "src/core/StashService";
import { useScenesList } from "src/hooks";
import { ListFilterModel } from "src/models/list-filter/filter";
import { DisplayMode } from "src/models/list-filter/types";
import { showWhenSelected, PersistanceLevel } from "src/hooks/ListHook";
import Tagger from "src/components/Tagger";
import { WallPanel } from "../Wall/WallPanel";
import { SceneCard } from "./SceneCard";
import { SceneListTable } from "./SceneListTable";
import { EditScenesDialog } from "./EditScenesDialog";
import { DeleteScenesDialog } from "./DeleteScenesDialog";
import { SceneGenerateDialog } from "./SceneGenerateDialog";
import { ExportDialog } from "../Shared/ExportDialog";

interface ISceneList {
  filterHook?: (filter: ListFilterModel) => ListFilterModel;
  persistState?: PersistanceLevel.ALL;
}

export const SceneList: React.FC<ISceneList> = ({
  filterHook,
  persistState,
}) => {
  const history = useHistory();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExportAll, setIsExportAll] = useState(false);

  const otherOperations = [
    {
      text: "Play Random",
      onClick: playRandom,
    },
    {
      text: "Generate...",
      onClick: generate,
      isDisplayed: showWhenSelected,
    },
    {
      text: "Export...",
      onClick: onExport,
      isDisplayed: showWhenSelected,
    },
    {
      text: "Export all...",
      onClick: onExportAll,
    },
  ];

  const addKeybinds = (
    result: FindScenesQueryResult,
    filter: ListFilterModel
  ) => {
    Mousetrap.bind("p r", () => {
      playRandom(result, filter);
    });

    return () => {
      Mousetrap.unbind("p r");
    };
  };

  const renderDeleteDialog = (
    selectedScenes: SlimSceneDataFragment[],
    onClose: (confirmed: boolean) => void
  ) => <DeleteScenesDialog selected={selectedScenes} onClose={onClose} />;

  const listData = useScenesList({
    zoomable: true,
    selectable: true,
    otherOperations,
    renderContent,
    renderEditDialog: renderEditScenesDialog,
    renderDeleteDialog,
    filterHook,
    addKeybinds,
    persistState,
  });

  async function playRandom(
    result: FindScenesQueryResult,
    filter: ListFilterModel
  ) {
    // query for a random scene
    if (result.data && result.data.findScenes) {
      const { count } = result.data.findScenes;

      const index = Math.floor(Math.random() * count);
      const filterCopy = _.cloneDeep(filter);
      filterCopy.itemsPerPage = 1;
      filterCopy.currentPage = index + 1;
      const singleResult = await queryFindScenes(filterCopy);
      if (
        singleResult &&
        singleResult.data &&
        singleResult.data.findScenes &&
        singleResult.data.findScenes.scenes.length === 1
      ) {
        const { id } = singleResult!.data!.findScenes!.scenes[0];
        // navigate to the scene player page
        history.push(`/scenes/${id}?autoplay=true`);
      }
    }
  }

  async function generate() {
    setIsGenerateDialogOpen(true);
  }

  async function onExport() {
    setIsExportAll(false);
    setIsExportDialogOpen(true);
  }

  async function onExportAll() {
    setIsExportAll(true);
    setIsExportDialogOpen(true);
  }

  function maybeRenderSceneGenerateDialog(selectedIds: Set<string>) {
    if (isGenerateDialogOpen) {
      return (
        <>
          <SceneGenerateDialog
            selectedIds={Array.from(selectedIds.values())}
            onClose={() => {
              setIsGenerateDialogOpen(false);
            }}
          />
        </>
      );
    }
  }

  function maybeRenderSceneExportDialog(selectedIds: Set<string>) {
    if (isExportDialogOpen) {
      return (
        <>
          <ExportDialog
            exportInput={{
              scenes: {
                ids: Array.from(selectedIds.values()),
                all: isExportAll,
              },
            }}
            onClose={() => {
              setIsExportDialogOpen(false);
            }}
          />
        </>
      );
    }
  }

  function renderEditScenesDialog(
    selectedScenes: SlimSceneDataFragment[],
    onClose: (applied: boolean) => void
  ) {
    return (
      <>
        <EditScenesDialog selected={selectedScenes} onClose={onClose} />
      </>
    );
  }

  function renderSceneCard(
    scene: SlimSceneDataFragment,
    selectedIds: Set<string>,
    zoomIndex: number
  ) {
    return (
      <SceneCard
        key={scene.id}
        scene={scene}
        zoomIndex={zoomIndex}
        selecting={selectedIds.size > 0}
        selected={selectedIds.has(scene.id)}
        onSelectedChanged={(selected: boolean, shiftKey: boolean) =>
          listData.onSelectChange(scene.id, selected, shiftKey)
        }
      />
    );
  }

  function renderScenes(
    result: FindScenesQueryResult,
    filter: ListFilterModel,
    selectedIds: Set<string>,
    zoomIndex: number
  ) {
    if (!result.data || !result.data.findScenes) {
      return;
    }
    if (filter.displayMode === DisplayMode.Grid) {
      return (
        <div className="row justify-content-center">
          {result.data.findScenes.scenes.map((scene) =>
            renderSceneCard(scene, selectedIds, zoomIndex)
          )}
        </div>
      );
    }
    if (filter.displayMode === DisplayMode.List) {
      return <SceneListTable scenes={result.data.findScenes.scenes} />;
    }
    if (filter.displayMode === DisplayMode.Wall) {
      return <WallPanel scenes={result.data.findScenes.scenes} />;
    }
    if (filter.displayMode === DisplayMode.Tagger) {
      return <Tagger scenes={result.data.findScenes.scenes} />;
    }
  }

  function renderContent(
    result: FindScenesQueryResult,
    filter: ListFilterModel,
    selectedIds: Set<string>,
    zoomIndex: number
  ) {
    return (
      <>
        {maybeRenderSceneGenerateDialog(selectedIds)}
        {maybeRenderSceneExportDialog(selectedIds)}
        {renderScenes(result, filter, selectedIds, zoomIndex)}
      </>
    );
  }

  return listData.template;
};
