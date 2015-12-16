## Ember FastBoot for AWS Elastic Beanstalk

This is an AWS Elastic Beanstalk-compatible Node.js server for hosting
an Ember app running in FastBoot mode.

FastBoot allows Ember apps to be rendered on the server, to support
things like search crawlers and clients without JavaScript. For more
information about FastBoot, see
[ember-cli-fastboot][ember-cli-fastboot].

[ember-cli-fastboot]: https://github.com/tildeio/ember-cli-fastboot

## Deploying

### Create S3 Bucket

Create an S3 bucket for uploading the FastBoot builds of your Ember.js
application.

### Create FastBoot Build

Inside your Ember.js application, run `ember fastboot:build`. Once that
finishes, zip up the resulting `fastboot-dist` and upload it to the S3
bucket you just created.

### Create Elastic Beanstalk Application

The below instructions cover using the Elastic Beanstalk CLI tool. Feel
free to use the web console or the API instead.

#### Install `eb`

First, install the [Elastic Beanstalk CLI tool][eb-cli] (`pip install
awsebcli`) if you don't have it installed already.

[eb-cli]: http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html

#### Initialize the Application

Clone this repository and `cd` into it in your terminal. Initialize the
directory as an EB application:

```sh
eb init
```

Enter your access key ID and secret access key if prompted. (You can
also pass `--profile` to `eb init` to use a saved credential profile
configured via the AWS CLI.)

Next, select your region. When prompted, choose the option to create a
new application:

```
Select an application to use
1) [ Create new Application ]
(default is 1):
```

Give your application a name. The `eb` tool should automatically detect
that the app is using Node.js; enter `y` when prompted.

Finally, decide whether you want to associate your instances with an SSH
keypair (if you don't, you won't be able to SSH into the server once
it's running).

Congratulations! You've created an Elastic Beanstalk app.

#### Create an Environment

Next, we'll need to create an environment. I like to create at least one
environment for staging and one for production.

First, you'll need to gather up some information about your app as we'll
need to set some environment variables to tell the server where to find
your FastBoot app.

You'll need:

* The name of your Ember app (e.g., if you ran `ember new my-app`, the
  name of your app is `my-app`)
* The S3 bucket you created in the first step
* The S3 key for the zip file you uploaded

Next, create an environment and pass the appropriate environment
variables using the `--envvars` option. These options tell the FastBoot
server where to download your app from.

```sh
eb create --envvars FASTBOOT_APP_NAME=<app-name>,FASTBOOT_S3_BUCKET=<s3-bucket>,FASTBOOT_S3_KEY=<s3-key>
```

Enter a name and a DNS CNAME prefix. (The CNAME prefix is used to create
a URL for your app; so if you enter `ember-fastboot` as the prefix, your
URL will be `ember-fastboot.elasticbeanstalk.com`.)

Once you've entered this information, `eb` will automatically zip up
the server and deploy it. You'll need to wait a few minutes while the
entire environment&mdash;security group, load balancer, EC2 instances,
etc.&mdash;all spin up.

After everything has been provisioned, you should see a message saying
the environment has moved to the "Ok" state.

Congratulations! You've just deployed a cluster of auto-scaling FastBoot
servers to Elastic Beanstalk.

#### Deploy FastBoot App

> **NOTE**: A cluster of FastBoots is called a stampede.

## Roadmap

This is very beta. Expect improvements, better documentation, and much
more automation on the deploy side soon.
