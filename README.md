# Kwirth Chart for Backstage Plugin
This package is a Backstage plugin for **charting your kubernetes metrics in real-time**.

**NOTE: KwirthMetrics requires a Kwirth server running on Kubernetes whose version is at least 0.3.150**

This Backstage plugin allows you to view real-time charts of some metrics about your Kuebrnetes. This is not a Grafana, this is too much simple, so we have worked inside Kwirth to provide you complex easy-to-use metrics. We mean, 'complex' refers to the way the metrics are calculated and exposed in Kwirth to be consumed by Kwirth clients like this Backstage plugin, but we also mean **'easy-to-use'** beacuse you wont have the need to learn complex PromQL syntax and expressions, you will be able to select simple and representative metrics like %CPU, %Memory, network usage data of filesystem usage data.

It's very important to understand that for this plugin to work you need to install Kwirth on your Kubernetes cluster, that is, this plugin is just another front end for [Kwirth](https://jfvilas.github.io/kwirth).

Kwirth is a really-easy-to-use log exporting system for Kubernetes that runs in only one pod (*no database is needed*). Refer to Kwirth GitHub project for [info on installation](https://github.com/jfvilas/kwirth?tab=readme-ov-file#installation). Kwirth installation is *one command away* from you.

You can access [Kwirth project here](https://github.com/jfvilas/kwirth).

## What is this plugin for?
This Backstage plugin adds Backstage a feature for viewing real-time metrics about your pods directly inside your Backstage frontend application. The plugin will be enabled for any entity that is correctly tagged (according to Backstage Kubernetes core feature) and its correpsonding Kubernetes resources are found on any of the clusters that have been added to Backstage.

When KwirthMetrics is correctly installed and configured, it is possible to view Kubernetes logs on your Backstage portal like in this sample:

![kwirthmetrics-running](https://raw.githubusercontent.com/jfvilas/kwirthbackstage-chart/master/images/kwirthmetrics-running.png)

All needed configuration, and specially **permission settings** for using this plugin, must be done in the backend plugin and the app-config YAML of your Backstage instance. You can restrict access to pods, namespaces, clusters, etc... by configuring permissions to be applied by the backend plugin.

## How does it work?
Let's explain this by following a user working sequence:

1. A Backstage user searchs for an entity in the Backstage.
2. In the entity page there will be a new tab named 'KWIRTHMETRICS'.
3. When the user clicks on KWIRTHMETRICS the frontend plugin sends a request to the backend plugin asking for metrics information on several Kubernetes clusters.
4. The backend plugin sends requests to the Kwirth instances that are running on all the clusters added to Backstage. These requests ask for the following: *'Tell me all the pods that are labeled with the kubernetes-id label and do correspond with the entity I'm looking for'*. In response to this query, each Kwirth instance will send with a list of pods and the namespaces they belong to.
5. After that, the backend plugin checks the permissions of the connected user and prunes the previously received pod list removing the ones that the user has not access to.
6. With the final pod list, the backend plugin sends requests to the Kwirth instances on the clusters **asking for API Keys** specific for streaming real-time metrics.
7. With all this information, the backend builds a unique response containing all the pods the user have access to, and all the API keys needed to access metrics data.

If everyting is correctly configured and *tagged*, the user should see a list of clusters (all the clusters where the entity, i.e., a pod) has been found. When selecting a cluster, the user should see a list of namespaces where the entity is running.

The rest of the tale is pretty simple:
  - Add the metrics you want to see (CPU, memory...).
  - Press PLAY.
  - Take your pop-corn basket.
  - Enjoy!

## Installation
1. First of all, istall corresponding Backstage backend plugin [more information here](https://github.com/jfvilas/kwirthbackstage-backend).

2. Once the BAckstage pulgin is intalled and configured, please proceed to install this Backstage frontend plugin. The first step is adding the packages we need.

    ```bash
    # From your Backstage root directory
    yarn --cwd packages/app add @jfvilas/plugin-kwirth-metrics @jfvilas/plugin-kwirth-common
    ```

3. Make sure the [KwirthMetrics backend plugin](https://www.npmjs.com/package/@jfvilas/plugin-kwirth-backend#configure) is installed and configured.

4. Restart your Backstage instance.

Next step is tailoring some Backstage front app resources to include KwirthMetrics functionality.


## Tailor front app: Entity Pages
Add the plugin as a tab in your Entity pages:

Firstly, import the plugin module.
```typescript
// In packages/app/src/components/catalog/EntityPage.tsx
import { EntityKwirthMetricsContent } from '@jfvilas/plugin-kwirth-metrics';
import { isKwirthAvailable } from '@jfvilas/plugin-kwirth-common';
```

Then, add a tab to your EntityPage (the 'if' attribute is optional, you can keep the 'KwirthMetrics' tab always visible if you prefer to do it that way).
```jsx
// Note: Add to any other Pages as well (e.g. defaultEntityPage or webSiteEntityPage, for example)
const serviceEntityPage = (
    <EntityLayout>
    {/* other tabs... */}
    <EntityLayout.Route if={isKwirthAvailable} path="/kwirthmetrics" title="KwirthMetrics">
        <EntityKwirthMetricsContent />
    </EntityLayout.Route>
    </EntityLayout>
)
```

So your Backstage back and front sides are ready to show you the charts... you need now to tag your entities for Backstage to identify them as 'kwirth-enabled'.


## Identify objects: tag your entities
This is a two step jobs:

  - **Annotate** your entities (your catalog-info) to help Kwirth point your entities to the right Kubernetes objects.
  - **Label** your Kubernetes objects for Kwirth to understand the relation between objects and entities


1. Add `backstage.io/kubernetes-id` annotation to your `catalog-info.yaml` for the entities deployed to Kubernetes whose metrics you want to be 'streamable' on Backstage. This is the same annotation that the Backstage Kubernetes core plugin uses, so, maybe you already have added it to your components.

    ```yaml
    metadata:
      annotations:
        backstage.io/kubernetes-id: entity-name
    ```

2. Add proper **labels** to your Kubernetes objects so Backstage can *link* forward and backward the Backstage entities with the Kubernetes objects. To do this, you need to add `labels` to your Kubernetes YAML objects (please, don't get confused: **annotations in Backstage YAML, labels in Kubernetes YAML**). This is an example of a typical Kubernetes deployment with the required label:

    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: ijkl
      labels:
        backstage.io/kubernetes-id: ijkl
    spec:
      selector:
        matchLabels:
          app: ijkl
      template:
        metadata:
          name: 'ijkl-pod'
          labels:
            app: ijkl
            backstage.io/kubernetes-id: ijkl
        spec:
          containers:
            - name: ijkl
              image: your-OCI-image
        ...    
    ```

Please note that the kubernetes-id label is **on the deployment** and on the **spec pod template** also.

And now, you can start enjoying your live-streaming metrics.

## Start: view the metrics
If you followed all these steps you would see a 'KwirthMetrics' tab in your **Entity Page** like following one when you access an kubernetes-tagged entity in your Backstage:

![kwirthmetrics-tab](https://raw.githubusercontent.com/jfvilas/kwirthbackstage-chart/master/images/kwirthmetrics-tab.png)

When you access the tab, if you have not yet tagged your entities you would see a message like this one explaning how to do that:

![notfound](https://raw.githubusercontent.com/jfvilas/kwirthbackstage-chart/master/images/kwirthmetrics-notfound.png)

Once you tagged your entities and your Kubernetes objects, you should see something similar to this:

![available](https://raw.githubusercontent.com/jfvilas/kwirthbackstage-chart/master/images/kwirthmetrics-available.png)

KwirthMetrics is ready to stream metrics!!

Just *select the cluster* on the cluster card and eventually set the *options* you want for the metrics streaming. On the new card that will appear on right, you will see all the Kubernetes namespaces available (as chips) and some additional controls:
  - A stream control containing play, pause and stop buttons.
  - A metrics selector
  - Buttons for adding or removing metrics to the card
  
So you should:
  1. Customize your expirience by setting the options:
     - Width: Numebr of metrics you want to show horizaontally on each line.
     - Interval: time between metrics query.
     - Depth: number of past values you want to show on the charts.
  1. *Select a namespace* (just click on a chip, red chips are not enabled for you).
  2. Select one or more metrics and ADD them (one by one)
  3. *Click PLAY* button and wait some seconds.

![kwirth-metrics-running](https://raw.githubusercontent.com/jfvilas/kwirthbackstage-chart/master/images/kwirthmetrics-running.png)

Feel free to open issues and ask for more features.


==========================================================================================================





## Status information
When the log stream starts, and all along the life of the metrics-stream life (until it gets stopped or the window is closed), you will receive status information regarding the pod you are watching. This status information is shown on the top of the card (just at the immediate right of the cluster name) including 3 kids of information:

  - **Info**. Information regarding Pod management at Kubernetes cluster level (new pod, pod ended or pod modified).
  - **Warning**. Warnings related to the log stream.
  - **Error**. If there is an error in the stream, like invalid key use, or erroneous pod tagging, errors will be shown here.

The icons will light up in its corresponding color when a new status message arrives.

This is how it feels:
![status info](https://raw.githubusercontent.com/jfvilas/kwirthbackstage-chart/master/images/kwirthmetrics-status.png)
