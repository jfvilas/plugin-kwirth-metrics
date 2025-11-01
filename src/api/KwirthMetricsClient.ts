/*
Copyright 2024 Julio Fernandez

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api'
import { KwirthMetricsApi } from './types'
import { Entity } from '@backstage/catalog-model'
import { ClusterValidPods, getInfo, getResources, getVersion, IBackendInfo, requestAccess } from '@jfvilas/plugin-kwirth-common'
import { InstanceConfigScopeEnum } from '@jfvilas/kwirth-common'

export interface KwirthMetricsClientOptions {
    discoveryApi: DiscoveryApi
    fetchApi: FetchApi
}

export class KwirthMetricsClient implements KwirthMetricsApi {
    private readonly discoveryApi: DiscoveryApi
    private readonly fetchApi: FetchApi


    constructor(options: KwirthMetricsClientOptions) {
        this.discoveryApi = options.discoveryApi
        this.fetchApi = options.fetchApi
    }

    async getInfo() : Promise<IBackendInfo> {
        return getInfo(this.discoveryApi, this.fetchApi)
    }

    async getVersion() : Promise<string> {
        return getVersion(this.discoveryApi, this.fetchApi)
    }

    async getResources(entity:Entity): Promise<ClusterValidPods> {
        return getResources(this.discoveryApi, this.fetchApi, entity)
    }

    async requestAccess(entity:Entity, channel:string, scopes:InstanceConfigScopeEnum[]): Promise<ClusterValidPods[]> {
        return requestAccess(this.discoveryApi, this.fetchApi, entity, channel, scopes)
    }

}
