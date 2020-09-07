import { App } from '../app';
import { UserData } from '../userdata';
import { RegistryService, ExtensionManifest, Extension, ExtensionSpec, ExtensionVersion, Configuration, numberConfig } from '@automationcloud/engine';
import { injectable, inject } from 'inversify';
import { StorageController } from './storage';
import { EventBus } from '../event-bus';
import { controller } from '../controller';
import semver from 'semver';

const EXTENSIONS_AUTO_REFRESH_INTERVAL = numberConfig('EXTENSIONS_AUTO_REFRESH_INTERVAL', 5 * 60 * 1000);

/**
 * Manages installing extensions from registry and associated operations.
 */
@injectable()
@controller({ priority: 1001 })
export class ExtensionRegistryController {
    userData: UserData;

    installedExtensions: Extension[] = [];
    availableExtensions: ExtensionManifest[] = [];
    loading: boolean = false;
    error: Error | null = null;

    constructor(
        @inject('App')
        protected app: App,
        @inject(StorageController)
        protected storage: StorageController,
        @inject(EventBus)
        protected events: EventBus,
        @inject(RegistryService)
        protected registry: RegistryService,
        @inject(Configuration)
        protected config: Configuration,
    ) {
        this.userData = storage.createUserData('extensions');
        this.events.on('acApiAuthorised', () => this.refresh());
        this.events.on('extensionPublished', () => this.refresh());
        const interval = this.getAutoRefreshInterval();
        if (interval > 0) {
            // TODO consider making those checks cancellable
            // Note: we don't care if those overlap, because most async processes
            // use `this.loading` as a mutex
            setInterval(() => this.refresh(), interval);
        }
    }

    getAutoRefreshInterval() {
        return this.config.get(EXTENSIONS_AUTO_REFRESH_INTERVAL);
    }

    async init() {
        await this.initInstalledExtensions();
        // Refresh in background
        this.refresh().catch(() => {});
    }

    update() {
        const installedExtensionSpecs = this.installedExtensions.map(ext => ext.spec);
        this.userData.update({
            installedExtensionSpecs,
        });
    }

    async refresh() {
        if (this.loading) {
            return;
        }
        this.loading = true;
        try {
            this.error = null;
            this.availableExtensions = await this.registry.listExtensions();
            await this.checkAndInstallAutoUpdates();
        } catch (err) {
            this.error = err;
        } finally {
            this.loading = false;
        }
    }

    getInstalledVersion(manifest: ExtensionManifest): string | null {
        const ext = this.installedExtensions.find(ext => ext.spec.name === manifest.name);
        return ext ? ext.spec.version : null;
    }

    isOutdated(manifest: ExtensionManifest) {
        const installedVersion = this.getInstalledVersion(manifest);
        return installedVersion ? semver.gt(manifest.latestVersion, installedVersion) : false;
    }

    isVersionExist(name: string, version: string) {
        const manifest = this.availableExtensions.find(m => m.name === name);
        if (!manifest) {
            return false;
        }
        return manifest.versions.includes(version);
    }

    async initInstalledExtensions() {
        const data = await this.userData.loadData();
        const installedExtensionSpecs = (data.installedExtensionSpecs || []) as ExtensionSpec[];
        this.installedExtensions = [];
        const promises = installedExtensionSpecs.map(async spec => {
            try {
                const ext = await this.registry.loadExtension(spec.name, spec.version);
                this.installedExtensions.push(ext);
                console.info('Loaded extension', spec.name, spec.version);
            } catch (error) {
                console.warn(`Could not install extension ${spec.name}:${spec.version}`, error);
            }
        });
        await Promise.all(promises);
        this.events.emit('extensionsUpdated');
    }

    async installExtension(manifest: ExtensionManifest) {
        if (this.loading) {
            return;
        }
        this.loading = true;
        try {
            const ext = await this.registry.loadExtension(manifest.name, manifest.latestVersion);
            this._addExtension(ext);
            this.events.emit('extensionsUpdated');
        } catch (err) {
            alert('Could not install extension. Please see Console for additional information.');
            console.warn(`Could not install extension ${manifest.name}`, err);
        } finally {
            this.loading = false;
        }
    }

    async uninstallExtension(manifest: ExtensionManifest) {
        if (this.loading) {
            return;
        }
        this.loading = true;
        try {
            this.installedExtensions = this.installedExtensions.filter(e => e.spec.name !== manifest.name);
            this.update();
            this.events.emit('extensionsUpdated');
        } catch (err) {
            alert('Could not uninstall extension. Please see Console for additional information.');
            console.warn(`Could not uninstall extension ${manifest.name}`, err);
        } finally {
            this.loading = false;
        }
    }

    async updateExtension(manifest: ExtensionManifest) {
        if (this.loading) {
            return;
        }
        this.loading = true;
        try {
            const ext = await this.registry.loadExtension(manifest.name, manifest.latestVersion);
            this._addExtension(ext);
            this.events.emit('extensionsUpdated');
        } catch(err) {
            alert('Could not update extension. Please see Console for additional information.');
            console.warn(`Extension update failed ${manifest.name}`, err);
        } finally {
            this.loading = false;
        }
    }

    protected _addExtension(ext: Extension) {
        this.installedExtensions = this.installedExtensions.filter(e => e.spec.name !== ext.spec.name);
        this.installedExtensions.push(ext);
        this.update();
    }

    protected async checkAndInstallAutoUpdates() {
        const updates = this.collectAvailableAutoUpdates();
        if (updates.length === 0) {
            return;
        }
        console.info(`Auto-updating ${updates.length} extensions`, updates);
        const promises = updates.map(async updateInfo => {
            const  { name, version } = updateInfo;
            try {
                const ext = await this.registry.loadExtension(name, version);
                this._addExtension(ext);
                console.debug(`Updated ${name}@${version}`);
            } catch (err) {
                console.warn(`Extension auto-update failed ${name}@${version}`, err);
            }
        });
        await Promise.all(promises);
    }

    protected collectAvailableAutoUpdates() {
        const updates: ExtensionVersion[] = [];
        for (const ext of this.installedExtensions) {
            const { name } = ext.spec;
            const manifest = this.availableExtensions.find(m => m.name === name);
            if (!manifest) {
                continue;
            }
            const versionRange = `^${ext.spec.version}`;
            const maxSatisfying = semver.maxSatisfying(manifest.versions, versionRange);
            if (maxSatisfying && maxSatisfying !== ext.spec.version) {
                updates.push({ name, version: maxSatisfying });
            }
        }
        return updates;
    }

}