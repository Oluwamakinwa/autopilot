<template>
    <div class="modal">

        <div class="modal__header">
            New recipe
        </div>

        <div class="modal__body">
            <div class="form-row">
                <div class="form-row__label">
                    Name
                </div>
                <div class="form-row__controls">
                    <input class="input input--block"
                        type="text"
                        v-focus
                        v-model.trim="recipeName"
                        @keyup.enter="createRecipe()"/>
                </div>
            </div>

            <div class="form-row">
                <div class="form-row__label">
                    Group
                </div>
                <div class="form-row__controls">
                    <autocomplete
                        class="stretch"
                        v-model.trim="recipeGroup"
                        placeholder="Default"
                        :options="getGroupNames()"
                        @keyup.enter="createRecipe()"/>
                </div>
            </div>

            <div class="form-row">
                <div class="form-row__label">
                    Pipes ({{ selectedPipes.length }})
                </div>
                <div class="form-row__controls">
                    <div class="pipe-preview"
                        v-for="pipe in selectedPipes">
                        {{ pipe.type }}
                    </div>
                </div>
            </div>

        </div>
        <div class="modal__buttons group group--gap">
            <button class="button button--tertiary"
                @click="$emit('hide')">
                Cancel
            </button>
            <button class="button button--primary"
                @click="createRecipe()"
                :disabled="!canCreateRecipe">
                Create recipe
            </button>
        </div>
    </div>
</template>

<script>
export default {

    inject: [
        'pipeRecipes'
    ],

    props: {

    },

    data() {
        return {
            recipeName: '',
            recipeGroup: this.getGroupNames()[0] || ''
        };
    },

    computed: {

        viewport() {
            return this.app.viewports.scriptEditor;
        },

        selectedPipes() {
            return this.viewport.getSelectedItems();
        },

        canCreateRecipe() {
            return this.recipeName && this.selectedPipes.length > 0;
        },

        shown() {
            return this.viewport.showCreateRecipeModal;
        }

    },

    methods: {

        getGroupNames() {
            return this.pipeRecipes.pipeGroups.map(_ => _.name);
        },

        createRecipe() {
            if (!this.canCreateRecipe) {
                return;
            }
            const pipes = this.selectedPipes;
            const { recipeName, recipeGroup } = this;
            try {
                this.app.viewports.recipes.createPipeRecipe(recipeGroup, recipeName, pipes);
                this.recipeName = '';
                this.$emit('hide');
            } catch (err) {
                alert(err.message);
            }
        },

    }

};
</script>

<style scoped>
.pipe-preview {
    background: var(--color-warm--100);
    padding: var(--gap--small);
    border-radius: var(--border-radius);

    font-size: var(--font-size--small);
}

.pipe-preview + .pipe-preview {
    margin-top: var(--gap--small);
}
</style>
