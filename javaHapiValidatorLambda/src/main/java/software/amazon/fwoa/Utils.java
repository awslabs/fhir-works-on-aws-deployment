package software.amazon.fwoa;

import java.util.List;

public final class Utils {
    public static class DownloadedGuidesHolder {
        private List<IGObject> indices;
        private List<IGObject> resources;

        public DownloadedGuidesHolder(List<IGObject> indices, List<IGObject> resources) {
            this.indices = indices;
            this.resources = resources;
        }

        public List<IGObject> getIndices() {
            return indices;
        }

        public List<IGObject> getResources() {
            return resources;
        }
    }

    public static class IGObject {
        private String key;
        private String content;

        public IGObject(String key, String content) {
            this.key = key;
            this.content = content;
        }

        public String getKey() {
            return key;
        }

        public String getContent() {
            return content;
        }
    }
}
