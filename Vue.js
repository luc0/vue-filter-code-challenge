// root component
const AppComponent = {
  template: `<items-filter :filtersInit="[]"></items-filter>`
}

const app = Vue.createApp(AppComponent)

// Filters Component
app.component('items-filter', {
  props: {
    filtersInit: Array, // This is here in case the user wants to load filters.
  },
  data() {
    // comparisonFields and filterables are loaded from a constant in their own js files. I did this to avoid run a server. In a real case I would use fetch()
  	return {
      filters: this.filtersInit ? this.filtersInit : [],
      open: false,
  		comparisonFields,
      filterables,
	   }
  },
  mounted() {
      const token = 'ehf27Xfp7pk99Lk6QCX5GMZLRKzrGheP818rG7wyuImVOerSFWkf7Wsx21qG' // This should be in a .env variable
      axios.defaults.headers.common = {'Authorization': `Bearer ${token}`} // I set default token for axios.
  },
  methods: {
  	addFilter (filterable) {
  		this.filters.push({
  			id: `${this.filters.length + 1}`,
        ...filterable, // I inject the props at this level, to follow the same structure as the API.
  			comparison: null, // I define it null just to have the filter data structure.
  			value: null,
        open: true
  		})
  	},
    remove(filter) {
      this.filters = this.filters.filter( f => f.id != filter.id)
    },
    toggleFilterSelector() {
      this.open = !this.open
    },
    comparisonName(filter) {
      if(!filter.comparison) return // it's more clear avoiding nested code. So the following logic is more readable

      const comparisonField = this.comparisonFields[filter.type].find(f => f.id == filter.comparison)
      return comparisonField.name
    },
    getIcon(filterable) {
      const icons = {
        'number': 'chart-bar',
        'boolean': 'toggle-on',
        'string': 'file-alt',
        'date': 'calendar-check',
        'time': 'clock',
      }

      return 'fas fa-' + icons[filterable.type]
    }
  },
  template: `
  	<div class="filters">
  	  <a v-for="filter in filters" class="filter" @click="filter.open = !filter.open">
		  	<div class="filter-label">
          <span class="filter-type">
            <i class="fas fa-chart-bar"></i> {{ filter.label }}
          </span> 
          {{ comparisonName(filter) }}
          {{ filter.value }} 
        </div>

		  	<comparator-select
			  	v-model="filter"
			  	:filters="filters"
			  	:comparison-fields="comparisonFields"
          class="comparator-select"
          @remove-filter="remove(filter)"
          @click.stop
		  	></comparator-select>
  	  </a>

  	  <a v-on:click='toggleFilterSelector()' class="btn-filter">
        Add filter <i class="fas fa-plus-circle"></i>
        <div v-if="open" class="filter-selector">
          <a v-for="filterable in filterables" v-on:click='addFilter(filterable)'>
            <i :class="getIcon(filterable)"></i>
            {{ filterable.label }}
          </a>
        </div>
      </a>
  	</div>
  `
})

// Dropdown to select comparator type and the value
app.component('comparator-select', {
	props: {
    modelValue: Object,
    filters: Array,
    comparisonFields: Array
  },
	methods: {
		select(comparisonId) {
      this.modelValue.comparison = comparisonId
			this.$emit('update:modelValue', this.modelValue)

      const isBoolean = (comparisonId == 'true' || comparisonId == 'false')
      if(isBoolean) {
        this.submitFilters()
      }
		},
    getFiltersQueryData() { // transform the data to what API expects to be.
      let data = []

      this.filters.map(filter => {
        data.push({
          key: filter.key,
          type: filter.type,
          comparison: filter.comparison,
          value: filter.value,
        })
      })

      return data
    },
    toggleFilterEdition() {
      this.modelValue.open = !this.modelValue.open
    },
    async submitFilters() {
      this.toggleFilterEdition()
      
      const account = '5.min.crafts' // TODO: should be pass it as a prop maybe. (depends on functionality)
      // following consts, should be in a config file.
      const platform = 'instagram' 

      const page = 1;
      const sortBy = "posted_at"
      const sortDesc = true
      
      /* const accounts = await axios.post(`https://igblade.com/api/v3/users/${userId}/accounts/searches`) */
     
     // TODO: this should be in a config file, for more dinamic urls, (take in account version number.)
      const posts = await axios.post(`https://igblade.com/api/v3/${platform}/accounts/${account}/posts/searches`, {
         "filters": this.getFiltersQueryData(),
         "page": page,
         "sort_by": sortBy,
         "sort_desc": sortDesc
      })   
    }
	},
	template: `
		<div v-if="modelValue.open"> 
			<input-comparator
			  @change-radio="select($event)"
        @submit-filters="submitFilters()"
  			v-for="comparison in comparisonFields[modelValue.type]"
  			:comparison=comparison
  			:filter=modelValue
        :filters=filters
        class="input-comparator"
	  	></input-comparator>

      <div class="input-comparator-options" @click.stop="$emit('remove-filter', modelValue)" >
        <a class="btn-warning">
          <i class="fas fa-trash"></i> Delete Filter
        </a>
      </div>
  	</div>
	`
})

// Current comparator selector and value.
app.component('input-comparator', {
	props: {
    comparison: Object,
    filter: Object
  },
	methods: {
		showComparisonValueInput() {
			return (this.filter.comparison == this.comparison.id && this.needsValue())
		},
    needsValue() {
      return this.filter.type != 'boolean' // booleans doesn't need input. TODO: there are other cases that doesn't need value (for example: "is unknown").
    },
    getInputType(filter) {
      const types = {
        'number': 'number',
        'string': 'text',
        'date': 'date',
        'time': 'time',
      }

      return types[filter.type] // more readable than using switch case.
    },
    
	},
	template: `
		<div>
      <a @click="$emit('change-radio', comparison.id)" href="#" class="comparator-option">
  			<input
  				:value="comparison"
  				type="radio"
  				name="filterable"
          class="comparator-radio"
          :checked="showComparisonValueInput()"
        />
			  <span>{{ comparison.name }}</span>
      </a>

      <input 
        v-if="showComparisonValueInput()"
        v-model="filter.value" 
        :type="getInputType(filter)" 
        @keyup.enter.native="$emit('submit-filters')"
        class="comparator-value"
        />
		</div>
		`
})

// mount the root component to the DOM
app.mount('#filter-stack')
