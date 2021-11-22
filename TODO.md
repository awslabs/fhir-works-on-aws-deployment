#Thoughts on things to do
1. Clean up source/helper to remove hardcoded %%SOLUTION_NAME%% and %%SOLUTION_ID%% references. All references should come in from the CFN template and the custom resource should be generic.
2. Update CFN example template with mappings for SOLUTION_NAME and SOLUTION_ID that are then referenced throughout the template rather than hardcoded throughout template resources.
3. Replace the python example with a python version of helper. Python and Node.js custom resources are not required to have complete resource parity. We should update these custom resources as libraries are needed (although we can use each implementation as a reference when duplicating functionality).
4. Create a more generic version of source/helper/lib/website-helper.js
5. Create a generic version of source/web_site -- ideally add our own website framework
6. Provide unit tests for all examples
