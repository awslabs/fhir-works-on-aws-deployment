package software.amazon.fwoa;

import java.util.Collections;
import java.util.List;

public final class IGUtils {
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

    public static List<IGObject> EmptyIfNull(List<IGObject> iterable) {
        return iterable == null ? Collections.emptyList() : iterable;
    }
}