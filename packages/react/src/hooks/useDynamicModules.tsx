import { getModules } from '@module-federation/utilities';
import { UseDynamicModulesProps } from '../types/remote-props';
import { DefaultNoScope, DefaultRemoteName } from '../utilities/constants';
import { getRemoteFullUrl } from '../utilities/url';
import { RemoteEventDetails, RemoteEventType, RemoteLogLevel } from '../types/remote-events';
import { getRemoteNamespace } from '../utilities/federation';
import { emitEvent, logEvent } from '../utilities/logger';

/**
 * Dynamically imports multiple modules from a remote
 * @param url Url to the remote we want to import.
 * @param modules Which items from the exports collection to return.
 * @param remoteEntryFileName The name of the remote entry file. Usually RemoteEntry.js or Remote.js.
 * @param verbose Enable verbose console logging of activity.
 * @param useEvents Enable eventing of activity.
*/
export default function useDynamicModules({
  url,
  modules,
  remoteEntryFileName,
  verbose,
  useEvents,
}: UseDynamicModulesProps): Promise<any[] | undefined> {

  /** Checks the values passed through props, and validate/set them if not set */
  const setDefaults = () => {
    if (!remoteEntryFileName) {
        remoteEntryFileName = DefaultRemoteName;
    }
    if (!verbose) {
        verbose = false;
    }
    if (!useEvents) {
        useEvents = false;
    }
};
/**
     * Executes the hook after some basic validation.
    */
  const execute = (): Promise<any[] | undefined> => {
    // Define event details for reuse in the logger and error boundaries
    const remoteFullName = getRemoteNamespace(DefaultNoScope, modules, url, remoteEntryFileName);
    const eventDetails = { scope: DefaultNoScope, modules, url, detail: remoteFullName } as RemoteEventDetails;

    // Build our request, useful for logging as well
    const request = {
      remoteContainer: getRemoteFullUrl(url, remoteEntryFileName),
      modulePaths: modules,
    };

    // Fetch our results
    return getModules(request)
      .then((modules) => {
        // Everything worked out fine, log and pass the remote back
        useEvents && emitEvent(RemoteEventType.Imported, eventDetails);
        verbose && logEvent(RemoteLogLevel.Information, `Imported dynamic module: ${remoteFullName}`);
        return modules;
      })
      .catch((error) => {
        // Things did not work out fine, log and pass up the error.
        useEvents && emitEvent(RemoteEventType.FailedToImport, eventDetails);
        verbose && logEvent(RemoteLogLevel.Error, `Error importing dynamic module: ${remoteFullName}`, error);
        
        // Return the result
        if (!useEvents) {
            throw error;
        }
        
        // return nothing, let the events sort it out
        return undefined;
      });
  }
      
    // Set the defaults
    setDefaults();

    // Execute the import logic
    return execute();
};
