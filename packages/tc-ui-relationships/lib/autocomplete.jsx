// here's an extremely bare bones example of an autocomplete
const { h } = require('preact');
const Downshift = require('downshift');
const ReactAutocomplete = require('react-autocomplete');

const Autocomplete = props => (
	<ReactAutocomplete
		getItemValue={item => item.code}
		items={[
			{ code: 'apple', name: 'apple' },
			{ code: 'pear', name: 'pear' },
			{ code: 'orange', name: 'orange' },
			{ code: 'grape', name: 'grape' },
			{ code: 'banana', name: 'banana' },
		]}
		wrapperStyle={{}}
		renderInput={importantProps => (
			<span className="o-forms-input o-forms-input--text">
				<input
					name={props.propertyName}
					id={`${props.propertyName}-picker`}
					className="autocomplete__input"
					type="text"
					autoComplete="off"
					role="combobox"
					{...importantProps}
				/>
			</span>
		)}
		renderMenu={(items, value, style) =>
			console.log('as;ldkj salkdj a') || (
				<ul className="autocomplete__list" children={items} />
			)
		}
		renderItem={(item, isHighlighted) => (
			<li role="option" aria-selected={isHighlighted}>
				{item.name} <small>({item.code})</small>
			</li>
		)}
	/>
);
// onChange={(e) => value = e.target.value}
// onSelect={(val) => value = val}
// ,
//       hasMany,
//       dataType,
//       value,
//       lockedBy,
//       parentType,

// class MyInput extends React.Component {

//   constructor (props) {
//     super(props)
//     this.state = {
//       value: '',
//     }
//   }

//   render() {
//     return (
//       <ReactAutocomplete
//         items={[
//           { id: 'foo', label: 'foo' },
//           { id: 'bar', label: 'bar' },
//           { id: 'baz', label: 'baz' },
//         ]}
//         shouldItemRender={(item, value) => item.label.toLowerCase().indexOf(value.toLowerCase()) > -1}
//         getItemValue={item => item.label}
//         renderItem={(item, highlighted) =>
//           <div
//             key={item.id}
//             style={{ backgroundColor: highlighted ? '#eee' : 'transparent'}}
//           >
//             {item.label}
//           </div>
//         }
//         value={this.state.value}
//         onChange={e => this.setState({ value: e.target.value })}
//         onSelect={value => this.setState({ value })}
//       />
//     )
//   }
// }

// ReactDOM.render(<MyInput />, document.body)

// (
//   <Downshift
//     onChange={selection => {
//       if (selection) {
//         alert(`You selected ${selection.value}`)
//       } else {
//         alert('selection cleared')
//       }
//     }}
//     itemToString={item => (item ? item.value : '')}
//   >
//     {({
//       getInputProps,
//       getItemProps,
//       getLabelProps,
//       getMenuProps,
//       isOpen,
//       inputValue,
//       highlightedIndex,
//       selectedItem,
//     }) => (
//       <div>
//         <label {...getLabelProps()}>Enter a fruit</label>
//         <input {...getInputProps()} />
//         <ul {...getMenuProps()}>
//           {isOpen
//             ? items
//                 .filter(item => !inputValue || item.value.includes(inputValue))
//                 .map((item, index) => (
//                   <li
//                     {...getItemProps({
//                       key: item.value,
//                       index,
//                       item,
//                       style: {
//                         backgroundColor:
//                           highlightedIndex === index ? 'lightgray' : null,
//                         fontWeight: selectedItem === item ? 'bold' : 'normal',
//                       },
//                     })}
//                   >
//                     {item.value}
//                   </li>
//                 ))
//             : null}
//         </ul>
//       </div>
//     )}
//   </Downshift>
// )

module.exports = { Autocomplete };
