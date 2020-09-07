import { App } from '../app';
import { ModalMenuController } from './modal-menu';
import { ExpandableController } from './expandable';
import { NavigationController } from './navigation';
import { ClipboardLoaderController } from './clipboard-loader';
import { ObjectsController } from './objects';
import { HelpController } from './help';
import { FrequentItemController } from './frequent-item';
import { FeedbackController } from './feedback';

export { ClipboardLoaderController, ModalMenuController, ExpandableController, NavigationController };

export interface AppUiControllers {
    clipboardLoader: ClipboardLoaderController;
    modalMenu: ModalMenuController;
    expandable: ExpandableController;
    navigation: NavigationController;
    objects: ObjectsController;
    help: HelpController;
    frequentItems: FrequentItemController;
    feedbacks: FeedbackController;
}

export function createUiControllers(app: App): AppUiControllers {
    return {
        clipboardLoader: new ClipboardLoaderController(app),
        modalMenu: new ModalMenuController(app),
        expandable: new ExpandableController(app),
        navigation: new NavigationController(app),
        objects: new ObjectsController(app),
        help: new HelpController(app),
        frequentItems: new FrequentItemController(app),
        feedbacks: new FeedbackController(app),
    };
}